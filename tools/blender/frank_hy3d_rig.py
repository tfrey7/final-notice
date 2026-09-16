"""Auto-rig the coloured Hunyuan3D Frank and pose him, then hand the posed mesh to the buffer pass.

The mesh is one static piece, so a Rigify human metarig is fitted to it by height (crown to sole) and
bound with automatic weights; the pose is item 2252's punch swing in degrees, applied to the metarig's
own bones. Written as a .blend the buffer script can open, plus a look-at render of the pose.

Run headless only:
    blender --background --python tools/blender/frank_hy3d_rig.py -- <job.json>
"""

import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frank_hy3d_buffers as fhb  # noqa: E402

# item 2252's punch, as a forward swing in degrees per joint (spritesmith.pixelartist POSES)
PUNCH = {"spine": 12, "neck": -6, "thigh.L": 24, "shin.L": 16, "thigh.R": -20, "shin.R": 4,
         "upper_arm.R": 82, "forearm.R": 4, "upper_arm.L": 25, "forearm.L": 120}
HIPS_DROP = 0.05


def metarig(height):
    """Rigify's human metarig, scaled so its crown matches the mesh's, feet on the floor."""
    bpy.ops.preferences.addon_enable(module="rigify")
    bpy.ops.object.armature_human_metarig_add()
    rig = bpy.context.active_object
    bpy.context.view_layer.update()
    top = max((rig.matrix_world @ b.tail).z for b in rig.data.bones)
    scale = height / top
    rig.scale = (scale, scale, scale)
    rig.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    return rig


def weighted(obj):
    """How many vertices any deform group actually holds: bone heat can fail and leave them all empty."""
    return sum(1 for v in obj.data.vertices if v.groups and any(g.weight > 0.01 for g in v.groups))


def bind(obj, rig, how):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type=how)
    return weighted(obj)


def pose(rig, swing, drop):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for name, deg in swing.items():
        pb = rig.pose.bones.get(name)
        if pb is None:
            print("no bone", name)
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler.x = math.radians(deg)
    root = rig.pose.bones.get("spine")
    if root is not None:
        root.location.y = -drop / max(rig.scale.z, 1e-6)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()


def main():
    job = fhb.JOB
    out = job["out"]
    os.makedirs(out, exist_ok=True)
    obj, _, _, _ = fhb.prepared(job["glb"], job["sheet"])
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    rig = metarig(fhb.HEIGHT_M)
    how = "ARMATURE_AUTO"
    held = bind(obj, rig, how)
    if held < len(obj.data.vertices) // 10:
        # bone heat found no solution on the scanned mesh: envelopes need no solver
        how = "ARMATURE_ENVELOPE"
        held = bind(obj, rig, how)
    pose(rig, PUNCH, HIPS_DROP)
    blend = os.path.join(out, "frank-punch.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print("RIG " + json.dumps({"blend": blend, "bones": len(rig.data.bones), "bind": how,
                               "weighted": held, "verts": len(obj.data.vertices)}))


main()
