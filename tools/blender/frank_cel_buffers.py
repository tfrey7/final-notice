"""Frank Mercer v2 posed as spritesmith's frank_pose_buffers.py poses him, rendered as the pixel artist's
usual buffers plus two cel passes: flat light bands and Blender's Line Art outlines.

- `<pose>-cel.png`: a toon shader (Diffuse into Shader to RGB into a constant colour ramp) with one
  sun from the upper left and no ambient light, written as grey levels 0, 0.5 and 1 for the shadow,
  mid and lit bands, at the buffers' native 128 px;
- `<pose>-lineart.png`: Line Art (contour, crease, material borders, intersections) over holdout
  meshes, at 8x, so the pixel program decides which native pixels a line covers;
- `<pose>-toon.png`: the same toon shading in Frank's colours with the lines on top, at 8x, to look at.

Run headless only, from tools/frank-sprites.py --cel:
    blender --background <frank-mercer-v2.blend> --python tools/blender/frank_cel_buffers.py -- <job.json>
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

with open(sys.argv[sys.argv.index("--") + 1], encoding="utf-8") as _fh:
    JOB = json.load(_fh)
sys.path.insert(0, os.path.join(JOB["spritesmith"], "tools", "blender"))
import frank_pose_buffers as fpb  # noqa: E402

# the light's direction in camera terms (x right, y up, z toward the viewer), as frank-sprites.py's LIGHT
LIGHT_CAM = Vector((-0.55, 0.65, 0.52)).normalized()
BAND_AT = (0.18, 0.62)   # lit fraction where shadow turns to mid, and mid to lit
TOON_LEVELS = (0.46, 0.74, 1.0)
LINE_PX = 7.0            # Line Art thickness at 8x: a little under one native pixel
SKIN = 4                 # pixel_id lit from FRONT_CAM instead of the sun, so the face and hands stay out of shadow
FRONT_CAM = Vector((-0.35, 0.45, 0.82)).normalized()


def eevee(scene):
    for name in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = name
            return
        except TypeError:
            continue


def sun():
    direction = cam_to_world(LIGHT_CAM)
    data = bpy.data.lights.new("cel_sun", "SUN")
    data.energy = 1.0
    data.angle = 0.0
    obj = bpy.data.objects.new("cel_sun", data)
    bpy.context.scene.collection.objects.link(obj)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def cam_to_world(v):
    # the camera looks along world +y, so camera x is world x, camera up is world z, toward the viewer is -y
    return Vector((v.x, -v.z, v.y))


def toon_material(name, colour, levels, front=False):
    """Diffuse from the sun stepped into three bands; with front, the lit fraction is the surface
    normal against FRONT_CAM instead, which no Blender light has to reach."""
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


def line_art(scene):
    """A Grease Pencil object carrying a scene Line Art modifier, black, LINE_PX thick."""
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
    mod.radius = LINE_PX / 2 * scene.camera.data.ortho_scale / (fpb.CANVAS * 8)
    return obj


def swap(meshes, pick):
    for obj in meshes:
        slots = list(obj.data.materials)
        obj.data.materials.clear()
        for mat in slots:
            obj.data.materials.append(pick(mat))


def render(scene, path, size, lines_obj, lines):
    scene.render.resolution_x = scene.render.resolution_y = size
    lines_obj.hide_render = not lines
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def main():
    out = JOB["out"]
    os.makedirs(out, exist_ok=True)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    rig.rotation_euler = (0, 0, math.radians(90))
    bpy.context.view_layer.update()
    meshes = sorted((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: o.name)
    originals = {o.name: list(o.data.materials) for o in meshes}
    fpb.tag_faces(meshes)
    for obj in list(bpy.data.objects):
        if obj.type in ("CAMERA", "LIGHT") and obj.name != "brawler_cam":
            bpy.data.objects.remove(obj)
    scene = fpb.stage()
    world = bpy.data.worlds.new("cel_black")
    world.color = (0, 0, 0)
    scene.world = world
    sun()
    colours = JOB["colours"]  # pixel_id -> linear-ish 0-1 RGB
    band_mats, toon_mats = {}, {}
    for obj in meshes:
        for mat in originals[obj.name]:
            pid = int(mat["pixel_id"])
            front = pid == SKIN
            band_mats.setdefault(pid, toon_material("cel_band_%d" % pid, (1, 1, 1), (0.0, 0.5, 1.0), front))
            toon_mats.setdefault(pid, toon_material("cel_toon_%d" % pid, colours[str(pid)], TOON_LEVELS, front))
    holdout = holdout_material()
    lines = line_art(scene)
    poser = fpb.Poser(rig)
    result = {"poses": {}}
    for p in fpb.POSES:
        if p["name"] not in JOB["poses"]:
            continue
        poser.pose(p)
        bpy.context.view_layer.update()
        lines.hide_render = True
        written = fpb.render_buffers(scene, meshes, originals, out, p["name"])
        eevee(scene)
        scene.eevee.taa_render_samples = 1
        scene.render.filter_size = 0.0
        scene.view_settings.view_transform = "Raw"
        swap(meshes, lambda m: band_mats[int(m["pixel_id"])])
        written["cel"] = render(scene, os.path.join(out, p["name"] + "-cel.png"), fpb.CANVAS, lines, False)
        scene.eevee.taa_render_samples = 16
        scene.render.filter_size = 1.5
        swap(meshes, lambda m: holdout)
        written["lineart"] = render(scene, os.path.join(out, p["name"] + "-lineart.png"), fpb.CANVAS * 8, lines, True)
        for obj in meshes:
            obj.data.materials.clear()
            for mat in originals[obj.name]:
                obj.data.materials.append(toon_mats[int(mat["pixel_id"])])
        scene.view_settings.view_transform = "Standard"
        written["toon"] = render(scene, os.path.join(out, p["name"] + "-toon.png"), fpb.CANVAS * 8, lines, True)
        for obj in meshes:
            obj.data.materials.clear()
            for mat in originals[obj.name]:
                obj.data.materials.append(mat)
        result["poses"][p["name"]] = written
    print("CEL " + json.dumps(result))


main()
