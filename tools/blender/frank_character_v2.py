"""Frank Mercer v2: the MPFB (MakeHuman) character from spritesmith's frank_character.py, pushed
closer to Astra's sheet. Leaner and broader build, tousled hair with real volume, a rumpled suit,
a loosened tie, then one flat material slot per part for the pixel artist. The skeleton is the same
`game_engine` rig, so spritesmith's frank_pose_buffers.py poses it unchanged.

Needs the MPFB extension and the MakeHuman CC0 system assets (knowledge-base recipe
`blender-character-mpfb`). Run headless only:
    blender --background --python tools/blender/frank_character_v2.py -- <out dir>
"""

import json
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector, noise

MATERIALS = {"suit": 1, "shirt": 2, "tie": 3, "skin": 4, "hair": 5, "shoe": 6, "trousers": 7, "eye": 8}
# sRGB, picked off the swatches on Astra's sheet
COLOURS = {
    "suit": (74, 84, 116),
    "shirt": (214, 210, 206),
    "tie": (168, 64, 44),
    "skin": (232, 176, 136),
    "hair": (88, 56, 34),
    "shoe": (20, 18, 20),
    "trousers": (58, 64, 92),
    "eye": (40, 28, 20),
}
# leaner than v1 at the same age and height, so the pose scale holds (age below 0.5 shrinks him)
MACROS = {
    "gender": 1.0, "age": 0.5, "muscle": 1.0, "weight": 0.45, "proportions": 1.0, "height": 0.7,
    "cupsize": 0.5, "firmness": 0.5,
    "race": {"asian": 0.0, "caucasian": 1.0, "african": 0.0},
}
# MakeHuman shape targets, loaded before the rig so the skeleton fits the new shape
TARGETS = {
    "measure-shoulder-dist-incr": 0.9,
    "torso-vshape-incr": 0.8,
    "measure-waist-circ-decr": 0.5,
    "l-upperarm-shoulder-muscle-incr": 0.6,
    "r-upperarm-shoulder-muscle-incr": 0.6,
    "neck-scale-horiz-incr": 0.3,
    "head-age-decr": 0.4,
    "head-square": 0.5,
    "chin-width-incr": 0.5,
    "chin-prominent-incr": 0.5,
    "chin-height-incr": 0.2,
    "eyebrows-trans-down": 0.4,
    "nose-trans-forward": 0.2,
}
ASSETS = [
    ("eyes/low-poly/low-poly.mhclo", "Eyes", "eye"),
    ("eyebrows/eyebrow010/eyebrow010.mhclo", "Eyebrows", "hair"),
    ("hair/short02/short02.mhclo", "Hair", "hair"),
    ("clothes/male_elegantsuit01/male_elegantsuit01.mhclo", "Clothes", None),
    ("clothes/shoes02/shoes02.mhclo", "Clothes", "shoe"),
]
LICENCES = {
    "MPFB 2 add-on": "GPL-3.0 (the tool only)",
    "MakeHuman base mesh, targets, rig": "CC0",
    "MakeHuman system assets (hair, eyes, eyebrows, suit, shoes)": "CC0",
}
VIEWS = {"front": 0.0, "three-quarter": 45.0, "side": 90.0}
SLEEVE_END, CUFF_END = 0.12, 0.34
SEED = 2282


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def flat_material(name):
    rgb = tuple(srgb_to_linear(v) for v in COLOURS[name])
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1.0)
    mat.roughness = 0.8
    mat["pixel_id"] = MATERIALS[name]
    return mat


def mpfb_services():
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    return HumanService


def data_dir():
    return os.path.join(bpy.utils.user_resource("EXTENSIONS"), ".user", "user_default", "mpfb", "data")


def texture_pixels(obj):
    for mat in obj.data.materials:
        if mat and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image and node.image.size[0]:
                    w, h = node.image.size
                    return np.array(node.image.pixels[:], dtype=np.float32).reshape(h, w, 4)
    raise RuntimeError("no texture on " + obj.name)


def forearm_t(point, arm):
    head, tail = arm
    axis = tail - head
    t = (point - head).dot(axis) / axis.length_squared
    off = (point - (head + axis * t)).length
    return t, off


def face_islands(mesh):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    island = [-1] * len(bm.faces)
    count = 0
    for face in bm.faces:
        if island[face.index] >= 0:
            continue
        island[face.index] = count
        stack = [face]
        while stack:
            for edge in stack.pop().edges:
                for other in edge.link_faces:
                    if island[other.index] < 0:
                        island[other.index] = count
                        stack.append(other)
        count += 1
    bm.free()
    return island, count


def split_suit(suit, arms, hem_z, knee_z, neck_z, mats):
    """Each suit face gets a slot by texture colour and place: shirt, tie, jacket, trousers, and
    the rolled sleeves (jacket cuff, shirt cuff, nothing past the cuff)."""
    pix = texture_pixels(suit)
    h, w = pix.shape[:2]
    mesh = suit.data
    uvs = mesh.uv_layers.active.data
    mw = suit.matrix_world
    mesh.materials.clear()
    names = ("suit", "shirt", "tie", "trousers")
    for name in names:
        mesh.materials.append(mats[name])
    slot = {name: i for i, name in enumerate(names)}
    island_of, count = face_islands(mesh)
    centres = [mw @ poly.center for poly in mesh.polygons]
    lo = [Vector((9, 9, 9)) for _ in range(count)]
    hi = [Vector((-9, -9, -9)) for _ in range(count)]
    for i, c in enumerate(centres):
        k = island_of[i]
        lo[k] = Vector(map(min, lo[k], c))
        hi[k] = Vector(map(max, hi[k], c))
    tie = {k for k in range(count) if hi[k].x - lo[k].x < 0.1 and abs(lo[k].x + hi[k].x) < 0.04
           and hi[k].z - lo[k].z > 0.15 and lo[k].z > hem_z}
    legs = {k for k in range(count) if lo[k].z < knee_z}
    doomed = []
    counts = {}
    for poly in mesh.polygons:
        rgb = np.zeros(3)
        for li in poly.loop_indices:
            u, v = uvs[li].uv
            rgb += pix[min(h - 1, int(v * h)), min(w - 1, int(u * w)), :3]
        r, g, b = rgb / poly.loop_total
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        centre = centres[poly.index]
        island = island_of[poly.index]
        part = "suit"
        if island in tie or (lum <= 0.5 and abs(centre.x) < 0.035 and centre.y < 0 and neck_z - 0.3 < centre.z < neck_z):
            part = "tie"
        elif lum > 0.5:
            part = "shirt"
        elif island in legs and centre.z < hem_z + 0.2:
            part = "trousers"
        for arm in arms:
            if (centre.x > 0) != (arm[0].x > 0):
                continue
            t, off = forearm_t(centre, arm)
            if off < 0.12 and t > CUFF_END:
                doomed.append(poly.index)
            elif off < 0.12 and t > SLEEVE_END:
                part = "shirt"
        poly.material_index = slot[part]
        counts[part] = counts.get(part, 0) + 1
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in doomed], context="FACES")
    bm.to_mesh(mesh)
    bm.free()
    counts["removed past the cuff"] = len(doomed)
    return counts


def shaped_positions(obj):
    """World positions after shape targets, before any modifier (vert.co is the unshaped basis)."""
    saved = [(m, m.show_viewport) for m in obj.modifiers]
    for mod, _ in saved:
        mod.show_viewport = False
    bpy.context.view_layer.update()
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    points = [ev.matrix_world @ v.co for v in ev.data.vertices]
    for mod, shown in saved:
        mod.show_viewport = shown
    bpy.context.view_layer.update()
    assert len(points) == len(obj.data.vertices)
    return points


def bare_forearms(body, arms):
    for mod in body.modifiers:
        if mod.type != "MASK" or mod.vertex_group not in body.vertex_groups:
            continue
        group = body.vertex_groups[mod.vertex_group]
        freed = []
        for index, p in enumerate(shaped_positions(body)):
            for arm in arms:
                if (p.x > 0) == (arm[0].x > 0):
                    t, off = forearm_t(p, arm)
                    if off < 0.12 and t > CUFF_END - 0.04:
                        freed.append(index)
        if mod.invert_vertex_group:
            group.remove(freed)
        else:
            group.add(freed, 1.0, "REPLACE")


def move_vertices(obj, fn):
    """Apply fn(index, world co) -> new world co to the mesh and every shape key it carries."""
    mw, inv = obj.matrix_world, obj.matrix_world.inverted()
    keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else None
    layers = [kb.data for kb in keys] if keys else [obj.data.vertices]
    for layer in layers:
        for i, v in enumerate(layer):
            v.co = inv @ fn(i, mw @ v.co)
    obj.data.update()


def tousle_hair(hair, head_centre):
    """Lift the hair off the skull and break its neat shell into clumps: volume grows toward the
    crown and the back, noise pushes clumps in and out, and the fringe falls forward over the brow."""
    def shape(_, co):
        off = co - head_centre
        up = max(0.0, min(1.0, (off.z + 0.04) / 0.14))
        grow = 1.0 + 0.10 * up + 0.04
        p = head_centre + Vector((off.x * grow, off.y * grow, off.z * (1.0 + 0.16 * up)))
        n = noise.noise(co * 38.0)
        clump = noise.noise(co * 14.0 + Vector((3.1, 7.7, 1.3)))
        radial = (p - head_centre).normalized()
        p += radial * (0.018 * n + 0.022 * max(0.0, clump))
        if off.y < -0.03 and off.z > -0.01:
            front = min(1.0, (-0.03 - off.y) / 0.06)
            p += Vector((0.015 * noise.noise(co * 20.0), -0.018 * front, -0.05 * up * front))
        return p
    move_vertices(hair, shape)


def rumple(obj, mesh_faces_skip=()):
    """Folds: low-frequency noise pushes cloth along its normals, stronger at elbows, the waist and
    behind the knees where real cloth bunches."""
    mesh = obj.data
    skip = set()
    for poly in mesh.polygons:
        if poly.index in mesh_faces_skip:
            skip.update(poly.vertices)
    normals = [v.normal.copy() for v in mesh.vertices]
    mw = obj.matrix_world

    def shape(i, co):
        if i in skip:
            return co
        n = mw.to_3x3() @ normals[i]
        ridge = abs(noise.noise(Vector((co.x * 9.0, co.y * 9.0, co.z * 26.0)))) - 0.25
        blotch = noise.noise(co * 6.0)
        return co + n * (0.010 * ridge + 0.006 * blotch)
    move_vertices(obj, shape)


def loosen_tie(suit, tie_faces, neck_z):
    """Drag the knot down off the collar and swing the blade across the shirt."""
    mesh = suit.data
    other = set()
    mine = set()
    for poly in mesh.polygons:
        (mine if poly.index in tie_faces else other).update(poly.vertices)
    # the seam verts move too, or the strip tears into a bunched cravat at its edges
    only = mine
    zs = [(suit.matrix_world @ mesh.vertices[i].co).z for i in only] or [neck_z]
    top, bottom = max(zs), min(zs)

    def shape(i, co):
        if i not in only:
            return co
        t = (top - co.z) / max(0.01, top - bottom)
        return co + Vector((0.045 * t * t, -0.008 - 0.008 * t, -0.02 * (1.0 - t) - 0.01))
    move_vertices(suit, shape)
    return len(only)


def build(out_dir):
    random.seed(SEED)
    HumanService = mpfb_services()
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    from bl_ext.user_default.mpfb.services.targetservice import TargetService
    body = HumanService.create_human(macro_detail_dict=MACROS)
    for name, weight in TARGETS.items():
        TargetService.load_target(body, TargetService.target_full_path(name), weight=weight)
    bpy.context.view_layer.update()
    rig =HumanService.add_builtin_rig(body, "game_engine")
    data = data_dir()
    worn = {}
    for rel, kind, part in ASSETS:
        obj = HumanService.add_mhclo_asset(os.path.join(data, rel), body, asset_type=kind, material_type="MAKESKIN")
        worn[rel] = (obj, part)
    bpy.context.view_layer.update()
    mats = {name: flat_material(name) for name in COLOURS}

    bones = rig.data.bones
    world = rig.matrix_world
    arms = [(world @ bones[n].head_local, world @ bones[n].tail_local) for n in ("lowerarm_l", "lowerarm_r")]
    hem_z = (world @ bones["thigh_l"].head_local).z - 0.13
    knee_z = (world @ bones["calf_l"].head_local).z
    neck_z = (world @ bones["neck_01"].head_local).z
    head = bones["head"]
    head_centre = world @ (head.head_local + (head.tail_local - head.head_local) * 0.45)

    body.data.materials.clear()
    body.data.materials.append(mats["skin"])
    report = {}
    for rel, (obj, part) in worn.items():
        if part:
            obj.data.materials.clear()
            obj.data.materials.append(mats[part])
        if kind_of(rel) == "hair":
            tousle_hair(obj, head_centre)
        elif part is None:
            report[rel] = split_suit(obj, arms, hem_z, knee_z, neck_z, mats)
            tie_faces = {p.index for p in obj.data.polygons if p.material_index == 2}
            report[rel]["tie vertices loosened"] = loosen_tie(obj, tie_faces, neck_z)
            rumple(obj, tie_faces)
    bare_forearms(body, arms)

    render_views(out_dir)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, "frank-mercer-v2.blend"), compress=True)
    with open(os.path.join(out_dir, "frank-mercer-v2.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"materials": MATERIALS, "colours": COLOURS, "macros": MACROS, "targets": TARGETS,
                   "assets": [a[0] for a in ASSETS], "licences": LICENCES, "suit_faces": report}, fh, indent=2)


def kind_of(rel):
    return rel.split("/")[0]


def render_views(out_dir):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = False
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x, scene.render.resolution_y = 960, 1200
    scene.render.film_transparent = False
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.color = (0.18, 0.18, 0.18)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.3
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for name, deg in VIEWS.items():
        a = math.radians(deg)
        cam.location = Vector((10 * math.sin(a), -10 * math.cos(a), 1.0))
        cam.rotation_euler = (math.radians(90), 0.0, a)
        scene.render.filepath = os.path.join(out_dir, name + ".png")
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = os.path.abspath(argv[0] if argv else "out/frank-mercer-v2")
    os.makedirs(out, exist_ok=True)
    build(out)
