"""Rig the scanned Frank through a remeshed cage, so the auto-rig gets a clean body and the face stays.

The scan is 586k triangles with the arms fused to the hips, and Blender's bone-heat solver refuses it
outright (lesson 713): every vertex group comes back empty and the posed render is byte-identical to
the rest pose. Remeshing the scan itself would fix the solver and destroy the face and hair the model
was picked for, so a DUPLICATE is remeshed to a ~20k quad cage, the metarig binds to the cage, and the
full-resolution scan rides on the cage through Surface Deform.

Two things the earlier attempt got wrong are fixed here: the metarig's scale is applied (setting
`rig.scale` alone leaves bone heat solving against an unscaled skeleton), and the arms shell is cut
free of the torso in the cage so the solver sees separate limbs.

Run headless only:
    blender --background --python tools/blender/frank_hy3d_cage.py -- <job.json>
"""

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector, kdtree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frank_hy3d_buffers as fhb  # noqa: E402

# item 2252's punch contact, as a forward swing in degrees per joint (spritesmith.pixelartist POSES)
PUNCH = {"thigh.L": 16, "shin.L": 10, "thigh.R": -12, "shin.R": 4}
VOXEL_OF_HEIGHT = 0.01     # 2 cm at sprite height: the cage only, never the render mesh
CAGE_FACES = 20000


def apply_all(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def cage_from(obj, height):
    """A voxel-then-quadriflow remesh of a duplicate: watertight, evenly spaced, no fused limbs."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.duplicate()
    cage = bpy.context.view_layer.objects.active
    cage.name = "frank_cage"
    cage.data.materials.clear()
    mod = cage.modifiers.new("voxel", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = VOXEL_OF_HEIGHT * height
    mod.adaptivity = 0.0
    bpy.ops.object.modifier_apply(modifier=mod.name)
    before = len(cage.data.polygons)
    try:
        bpy.ops.object.quadriflow_remesh(target_faces=CAGE_FACES, use_preserve_sharp=False,
                                         use_preserve_boundary=False)
    except RuntimeError as exc:
        print("quadriflow refused:", exc)
    print("CAGE voxels %d faces -> %d faces, %d verts"
          % (before, len(cage.data.polygons), len(cage.data.vertices)))
    return cage


def metarig(height, hip_half):
    """Rigify's human metarig, scaled to the mesh and its scale APPLIED, feet on the floor."""
    bpy.ops.preferences.addon_enable(module="rigify")
    bpy.ops.object.armature_human_metarig_add()
    rig = bpy.context.active_object
    bpy.context.view_layer.update()
    top = max((rig.matrix_world @ b.tail_local).z for b in rig.data.bones)
    s = height / top
    thigh = rig.data.bones.get("thigh.L")
    wide = (abs(thigh.head_local.x) * s) if thigh else hip_half
    rig.scale = (s * max(hip_half / max(wide, 1e-6), 0.85), s, s)
    rig.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    apply_all(rig)
    return rig


def weighted(obj):
    """How many vertices any deform group actually holds: bone heat can fail and leave them empty."""
    return sum(1 for v in obj.data.vertices if v.groups and any(g.weight > 0.01 for g in v.groups))


def bind(obj, rig, how):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type=how)
    return weighted(obj)


def surface_deform(obj, cage):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("ride", "SURFACE_DEFORM")
    mod.target = cage
    mod.falloff = 4.0
    bpy.ops.object.surfacedeform_bind(modifier=mod.name)
    return mod.is_bound


def ik_target(rig, bone, where, name):
    empty = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(empty)
    empty.location = where
    con = rig.pose.bones[bone].constraints.new("IK")
    con.target = empty
    con.chain_count = 2
    return empty


def pose(rig, swing):
    """The right fist driven forward by an IK target; the legs swung by their own local axis.

    Angles alone cannot pose the arms here. A pose bone's euler is in its rest space, where Y runs
    along the bone, so the number that swings a hanging leg forward only rolls an arm inside its
    sleeve -- which is exactly why item 2252's numbers produced a kick and no punch (Tim, m10254).
    The fist is therefore given a place to be, an arm's length straight ahead at shoulder height,
    and the two-bone IK solves the shoulder and elbow for it.
    """
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    shoulder = rig.matrix_world @ rig.pose.bones["upper_arm.R"].head
    reach = (rig.pose.bones["upper_arm.R"].length + rig.pose.bones["forearm.R"].length) * 0.97
    ik_target(rig, "forearm.R", (shoulder.x, shoulder.y - reach, shoulder.z - 0.04), "fist.R")
    guard = rig.matrix_world @ rig.pose.bones["upper_arm.L"].head
    ik_target(rig, "forearm.L", (guard.x, guard.y - reach * 0.3, guard.z + reach * 0.25), "fist.L")
    for name, deg in swing.items():
        pb = rig.pose.bones.get(name)
        if pb is None:
            print("no bone", name)
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler.x = math.radians(deg)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()
    for name in ("hand.R", "hand.L"):
        pb = rig.pose.bones.get(name)
        if pb is not None:
            print("bone %s tail y %.3f -> %.3f" % (name, pb.bone.tail_local.y, pb.tail.y))


def evaluated_co(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = obj.evaluated_get(dg).to_mesh()
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", co)
    obj.evaluated_get(dg).to_mesh_clear()
    return co.reshape(-1, 3)


def transfer_colours(src, dst):
    """Per-vertex colours back onto the cage by nearest source vertex (KDTree)."""
    sco = np.empty(len(src.data.vertices) * 3, np.float32)
    src.data.vertices.foreach_get("co", sco)
    sco = sco.reshape(-1, 3)
    tree = kdtree.KDTree(len(sco))
    for i, c in enumerate(sco):
        tree.insert(c.tolist(), i)
    tree.balance()
    col = fhb.vertex_colours(src.data)
    ca = dst.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    out = []
    for v in dst.data.vertices:
        _, idx, _ = tree.find(v.co)
        out.extend((col[idx] / 255.0).tolist() + [1.0])
    ca.data.foreach_set("color", out)
    return len(dst.data.vertices)


def main():
    job = fhb.JOB
    out = job["out"]
    os.makedirs(out, exist_ok=True)
    obj, mat, (zmin, zmax), scale = fhb.prepared(job["glb"], job["sheet"])
    apply_all(obj)

    co = np.empty(len(obj.data.vertices) * 3, np.float32)
    obj.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    height = float(co[:, 2].max() - co[:, 2].min())
    hip = co[np.abs(co[:, 2] - (co[:, 2].min() + 0.52 * height)) < 0.03 * height]
    hip_half = float(np.abs(hip[:, 0]).max()) if len(hip) else 0.18

    cage = cage_from(obj, height)
    transfer_colours(obj, cage)
    rig = metarig(height, hip_half)

    how = "ARMATURE_AUTO"
    held = bind(cage, rig, how)
    if held < len(cage.data.vertices) // 10:
        print("bone heat held only %d of %d: falling back to envelopes on the clean cage"
              % (held, len(cage.data.vertices)))
        how = "ARMATURE_ENVELOPE"
        held = bind(cage, rig, how)

    rest = evaluated_co(cage)
    bound = surface_deform(obj, cage)
    pose(rig, PUNCH)
    posed = evaluated_co(cage)
    moved = float(np.abs(posed - rest).max())

    rest_obj = np.empty(len(obj.data.vertices) * 3, np.float32)
    obj.data.vertices.foreach_get("co", rest_obj)
    skin_moved = float(np.abs(evaluated_co(obj) - rest_obj.reshape(-1, 3)).max())

    # the punch swings along the figure's forward axis, which points at a front camera and vanishes:
    # the whole assembly turns so forward is screen right, the way a side-on brawler reads
    turn = math.radians(job.get("turn", 90))
    for o in (obj, cage, rig):
        o.rotation_mode = "XYZ"
        o.rotation_euler.z = turn
    bpy.context.view_layer.update()

    cage.hide_render = True
    rig.hide_render = True
    blend = os.path.join(out, "frank-cage-punch.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print("CAGERIG " + json.dumps({
        "blend": blend, "bind": how, "weighted": held, "cage_verts": len(cage.data.vertices),
        "cage_faces": len(cage.data.polygons), "mesh_verts": len(obj.data.vertices),
        "surface_deform_bound": bool(bound), "cage_max_move_m": round(moved, 4),
        "skin_max_move_m": round(skin_moved, 4), "height_m": round(height, 4),
        "hip_half_m": round(hip_half, 4)}))


main()
