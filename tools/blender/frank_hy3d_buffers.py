"""The coloured Hunyuan3D Frank (assets/3d/frank-mercer-hy3d) rendered as the pixel artist's buffers.

The mesh is one static piece with per-vertex colour projected from Astra's sheet (item 2331), so the
material ids the pixel artist reads are recovered from those colours: each vertex is classified to the
nearest of the sheet's palette swatches, smoothed over the mesh edges, then the suit is split into
jacket and trousers at the hem and the shoes confined to the bottom of the figure. Camera, scale and
ground row are spritesmith's frank_pose_buffers, so the frames sit on the same row as today's.

Writes per pose: `<pose>-ids.png`, `-normal.png`, `-depth.png` at 128 px, plus `-cel.png` (toon bands)
and `-lineart.png` at 8x for tools/frank-sprites.py --cel.

Run headless only:
    blender --background --python tools/blender/frank_hy3d_buffers.py -- <job.json>
"""

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

with open(sys.argv[sys.argv.index("--") + 1], encoding="utf-8") as _fh:
    JOB = json.load(_fh)

CANVAS = 128
PX_PER_M = 44.0
GROUND_ROW = 120
HIP_COL = 64
HEIGHT_M = 2.0
NEAR, FAR = 6.0, 10.0

JACKET, SHIRT, TIE, SKIN, HAIR, SHOE, TROUSERS = 1, 2, 3, 4, 5, 6, 7
REGION_MAT = {"suit": JACKET, "shirt": SHIRT, "tie": TIE, "hair": HAIR, "skin": SKIN, "shoes": SHOE}
NAMES = ["suit", "shirt", "tie", "hair", "skin", "shoes"]
HEM = 0.47          # of the figure's height: jacket above, trousers below
FOOT = 0.075        # of the figure's height: shoes live here
ARM_OUT = 0.60      # of the half width: past this a suit vertex is an arm, not the torso
LIGHT_CAM = Vector((-0.55, 0.65, 0.52)).normalized()
BAND_AT = (0.18, 0.62)
LINE_PX = 7.0
FRONT_CAM = Vector((-0.35, 0.45, 0.82)).normalized()


def cam_to_world(v):
    return Vector((v.x, -v.z, v.y))


def emission_material(name, build_nodes):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    emit = tree.nodes.new("ShaderNodeEmission")
    tree.links.new(emit.outputs[0], out.inputs["Surface"])
    build_nodes(tree, emit)
    return mat


def flat(colour):
    def nodes(tree, emit):
        emit.inputs["Color"].default_value = tuple(colour) + (1.0,)
    return nodes


def normals(tree, emit):
    geo = tree.nodes.new("ShaderNodeNewGeometry")
    tf = tree.nodes.new("ShaderNodeVectorTransform")
    tf.vector_type, tf.convert_from, tf.convert_to = "NORMAL", "WORLD", "CAMERA"
    half = tree.nodes.new("ShaderNodeVectorMath")
    half.operation = "SCALE"
    half.inputs["Scale"].default_value = 0.5
    shift = tree.nodes.new("ShaderNodeVectorMath")
    shift.operation = "ADD"
    shift.inputs[1].default_value = (0.5, 0.5, 0.5)
    tree.links.new(geo.outputs["Normal"], tf.inputs["Vector"])
    tree.links.new(tf.outputs["Vector"], half.inputs[0])
    tree.links.new(half.outputs["Vector"], shift.inputs[0])
    tree.links.new(shift.outputs["Vector"], emit.inputs["Color"])


def depth(tree, emit):
    cam = tree.nodes.new("ShaderNodeCameraData")
    rng = tree.nodes.new("ShaderNodeMapRange")
    rng.inputs["From Min"].default_value = NEAR
    rng.inputs["From Max"].default_value = FAR
    tree.links.new(cam.outputs["View Z Depth"], rng.inputs["Value"])
    comb = tree.nodes.new("ShaderNodeCombineColor")
    for i in range(3):
        tree.links.new(rng.outputs["Result"], comb.inputs[i])
    tree.links.new(comb.outputs["Color"], emit.inputs["Color"])


def toon_material(name, colour, levels, front=False):
    """The sun's diffuse stepped into three constant bands; with front, from the surface normal
    against the camera instead, so the face never falls into shadow."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    if front:
        geometry = tree.nodes.new("ShaderNodeNewGeometry")
        dot = tree.nodes.new("ShaderNodeVectorMath")
        dot.operation = "DOT_PRODUCT"
        dot.inputs[1].default_value = cam_to_world(FRONT_CAM)
        tree.links.new(geometry.outputs["Normal"], dot.inputs[0])
        lit = dot.outputs["Value"]
    else:
        diffuse = tree.nodes.new("ShaderNodeBsdfDiffuse")
        diffuse.inputs["Color"].default_value = (1, 1, 1, 1)
        to_rgb = tree.nodes.new("ShaderNodeShaderToRGB")
        tree.links.new(diffuse.outputs[0], to_rgb.inputs[0])
        lit = to_rgb.outputs["Color"]
    ramp = tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position, els[1].position = 0.0, BAND_AT[0]
    extra = els.new(BAND_AT[1])
    for el, level in zip((els[0], els[1], extra), levels):
        el.color = (colour[0] * level, colour[1] * level, colour[2] * level, 1.0)
    emit = tree.nodes.new("ShaderNodeEmission")
    tree.links.new(lit, ramp.inputs["Fac"])
    tree.links.new(ramp.outputs["Color"], emit.inputs["Color"])
    tree.links.new(emit.outputs[0], out.inputs["Surface"])
    return mat


def holdout_material():
    mat = bpy.data.materials.new("cel_holdout")
    mat.use_nodes = True
    tree = mat.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    out = tree.nodes.new("ShaderNodeOutputMaterial")
    tree.links.new(tree.nodes.new("ShaderNodeHoldout").outputs[0], out.inputs["Surface"])
    return mat


def sun():
    data = bpy.data.lights.new("cel_sun", "SUN")
    data.energy, data.angle = 1.0, 0.0
    obj = bpy.data.objects.new("cel_sun", data)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = cam_to_world(LIGHT_CAM).to_track_quat("Z", "Y").to_euler()
    return obj


def line_art(scene):
    gp = bpy.data.grease_pencils.new("cel_lines")
    obj = bpy.data.objects.new("cel_lines", gp)
    scene.collection.objects.link(obj)
    gp.layers.new("lines")
    ink = bpy.data.materials.new("cel_ink")
    bpy.data.materials.create_gpencil_data(ink)
    ink.grease_pencil.color = (0.0, 0.0, 0.0, 1.0)
    gp.materials.append(ink)
    mod = obj.modifiers.new("lineart", "LINEART")
    mod.source_type = "SCENE"
    mod.target_layer = "lines"
    mod.target_material = ink
    mod.use_contour = mod.use_crease = mod.use_material = mod.use_intersection = True
    mod.radius = LINE_PX / 2 * scene.camera.data.ortho_scale / (CANVAS * 8)
    return obj


def swatch(px, cx, cy):
    return px[cy - 18:cy + 18, cx - 18:cx + 18].reshape(-1, 3).mean(0)


def sheet_palette(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], np.float32).reshape(h, w, 4)[::-1, :, :3] * 255.0
    pal = {"suit": swatch(px, 218, 948), "shirt": swatch(px, 351, 948), "tie": swatch(px, 483, 948),
           "hair": swatch(px, 750, 948), "skin": swatch(px, 885, 948), "shoes": np.array([22, 22, 26.0])}
    protos = [("suit", pal["suit"]), ("suit", swatch(px, 615, 948)), ("suit", pal["suit"] * 0.7),
              ("shirt", pal["shirt"]), ("shirt", pal["shirt"] * 0.72),
              ("tie", pal["tie"]), ("tie", pal["tie"] * 0.7),
              ("hair", pal["hair"]), ("hair", pal["hair"] * 1.35),
              ("skin", pal["skin"]), ("skin", pal["skin"] * np.array([0.8, 0.68, 0.6])),
              ("shoes", pal["shoes"])]
    return pal, protos


def load_mesh(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects:
        o.select_set(o.type == "MESH")
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def vertex_colours(me):
    nv = len(me.vertices)
    ca = me.color_attributes.active_color or me.color_attributes[0]
    raw = np.empty(len(ca.data) * 4, np.float32)
    ca.data.foreach_get("color_srgb", raw)
    raw = raw.reshape(-1, 4)[:, :3] * 255.0
    if ca.domain == "POINT":
        return raw[:nv]
    loops = np.empty(len(me.loops), np.int64)
    me.loops.foreach_get("vertex_index", loops)
    out = np.zeros((nv, 3))
    count = np.zeros(nv)
    np.add.at(out, loops, raw[:len(loops)])
    np.add.at(count, loops, 1)
    return out / np.maximum(count, 1)[:, None]


def classify(obj, protos):
    """Each vertex to a material id, from its projected colour, smoothed over the edges."""
    me = obj.data
    nv = len(me.vertices)
    col = vertex_colours(me)
    co = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    P = np.array([p[1] for p in protos])
    PL = np.array([NAMES.index(p[0]) for p in protos])
    lab = PL[((col[:, None, :] - P[None]) ** 2).sum(-1).argmin(1)]
    ev = np.empty(len(me.edges) * 2, np.int64)
    me.edges.foreach_get("vertices", ev)
    ev = ev.reshape(-1, 2)
    for _ in range(6):
        votes = np.zeros((nv, len(NAMES)))
        votes[np.arange(nv), lab] += 1.5
        np.add.at(votes, (ev[:, 0], lab[ev[:, 1]]), 1)
        np.add.at(votes, (ev[:, 1], lab[ev[:, 0]]), 1)
        lab = votes.argmax(1)
    zmin, zmax = co[:, 2].min(), co[:, 2].max()
    span = zmax - zmin
    foot = co[:, 2] < zmin + FOOT * span
    lab[~foot & (lab == NAMES.index("shoes"))] = NAMES.index("suit")
    mat = np.array([REGION_MAT[n] for n in NAMES])[lab]
    mat[(mat == JACKET) & (co[:, 2] < zmin + HEM * span)] = TROUSERS
    half = max(abs(co[:, 0].min()), abs(co[:, 0].max()))
    part = mat.copy()
    arm = (np.abs(co[:, 0]) > ARM_OUT * half) & (co[:, 2] > zmin + HEM * span)
    part[arm & (co[:, 0] < 0)] = 9
    part[arm & (co[:, 0] > 0)] = 10
    return mat, part, (zmin, zmax)


def assign_slots(obj, mat, part):
    """One material slot per (material, part) pair, each face taking its first vertex's pair."""
    me = obj.data
    pairs = sorted({(int(m), int(p)) for m, p in zip(mat, part)})
    slot = {pair: i for i, pair in enumerate(pairs)}
    me.materials.clear()
    for m, p in pairs:
        holder = bpy.data.materials.new("id_%d_%d" % (m, p))
        holder["pixel_id"], holder["part_id"] = m, p
        me.materials.append(holder)
    loops = np.empty(len(me.loops), np.int64)
    me.loops.foreach_get("vertex_index", loops)
    starts = np.empty(len(me.polygons), np.int64)
    me.polygons.foreach_get("loop_start", starts)
    first = loops[starts]
    index = np.array([slot[(int(mat[v]), int(part[v]))] for v in first], np.int32)
    attr = me.attributes.get("material_index") or me.attributes.new("material_index", "INT", "FACE")
    attr.data.foreach_set("value", index)
    me.update()
    back = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", back)
    print("slots", len(pairs), "faces per slot", np.bincount(back, minlength=len(pairs)).tolist())
    return pairs


def stage(scene):
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CANVAS / PX_PER_M
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = ((CANVAS / 2 - HIP_COL) / PX_PER_M, -8.0, (GROUND_ROW - CANVAS / 2) / PX_PER_M)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam
    return cam


def eevee(scene):
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = name
            return
        except TypeError:
            continue


def render(scene, path, size):
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def swap(obj, slots, pick):
    """Slots are replaced in place: clearing them would reset every face's material index to 0."""
    for i, mat in enumerate(slots):
        obj.data.materials[i] = pick(mat)


def prepared(glb, sheet):
    """The mesh imported, classified into id slots, and scaled to sprite height with its feet at z 0."""
    obj = load_mesh(glb)
    _, protos = sheet_palette(sheet)
    mat, part, (zmin, zmax) = classify(obj, protos)
    assign_slots(obj, mat, part)
    scale = HEIGHT_M / (zmax - zmin)
    obj.scale = (scale, scale, scale)
    obj.location = (obj.location.x, obj.location.y, -zmin * scale)
    bpy.context.view_layer.update()
    return obj, mat, (zmin, zmax), scale


def main():
    out = JOB["out"]
    os.makedirs(out, exist_ok=True)
    if JOB.get("blend"):
        bpy.ops.wm.open_mainfile(filepath=JOB["blend"])
        obj = max((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
        mat = np.array([int(m["pixel_id"]) for m in obj.data.materials])
        zmin = zmax = 0.0
        scale = 1.0
    else:
        obj, mat, (zmin, zmax), scale = prepared(JOB["glb"], JOB["sheet"])
    # the figure turns, not the camera, so the ground row and the hip column stay put
    root = obj.parent or obj
    root.rotation_mode = "XYZ"   # glTF leaves it on quaternion, where setting the euler does nothing
    root.rotation_euler = (root.rotation_euler.x, root.rotation_euler.y, math.radians(JOB.get("turn", 0)))
    bpy.context.view_layer.update()
    counts = {int(m): int((mat == m).sum()) for m in sorted(set(mat.tolist()))}

    scene = bpy.context.scene
    stage(scene)
    world = bpy.data.worlds.new("black")
    world.color = (0, 0, 0)
    scene.world = world
    sun()
    eevee(scene)
    scene.eevee.taa_render_samples = 1
    scene.render.filter_size = 0.0
    try:
        scene.view_settings.view_transform = "Raw"
    except TypeError:
        scene.view_settings.view_transform = "Standard"

    originals = list(obj.data.materials)
    pairs = [(int(m["pixel_id"]), int(m["part_id"])) for m in originals]
    ids = {}
    for m, p in set(pairs):
        ids[(m, p)] = emission_material("ids_%d_%d" % (m, p), flat((m / 16.0, p / 64.0, 0.0)))
    shared = {"normal": emission_material("normal", normals), "depth": emission_material("depth", depth)}
    band = {m: toon_material("band_%d" % m, (1, 1, 1), (0.0, 0.5, 1.0), m == SKIN) for m, _ in set(pairs)}
    lines = line_art(scene)
    holdout = holdout_material()

    tag = JOB.get("tag", "idle")
    written = {}
    lines.hide_render = True
    for name, pick in (("ids", lambda mm: ids[(int(mm["pixel_id"]), int(mm["part_id"]))]),
                       ("normal", lambda mm: shared["normal"]),
                       ("depth", lambda mm: shared["depth"]),
                       ("cel", lambda mm: band[int(mm["pixel_id"])])):
        swap(obj, originals, pick)
        written[name] = render(scene, os.path.join(out, "%s-%s.png" % (tag, name)), CANVAS)
    scene.eevee.taa_render_samples = 16
    scene.render.filter_size = 1.5
    swap(obj, originals, lambda mm: holdout)
    lines.hide_render = False
    written["lineart"] = render(scene, os.path.join(out, "%s-lineart.png" % tag), CANVAS * 8)
    swap(obj, originals, lambda mm: mm)
    print("HY3D " + json.dumps({"tag": tag, "counts": counts, "written": written,
                                "height": float(zmax - zmin), "scale": float(scale)}))


if __name__ == "__main__":
    main()
