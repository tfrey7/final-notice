"""Pose the scanned Frank by riding him on the hand-built mannequin's punch (items 2252, 2332).

Blender's bone-heat solver finds no solution on a 586k-vertex Hunyuan3D scan and envelopes tear the
suit, so nothing here asks it to: spritesmith's punch rig (tools/blender/frank_pose_rig.py, Astra's
drawings solved with two-bone IK) supplies the bone segments and the pose's absolute angles, the
weights are painted here by distance to those segments inside the regions the colour pass already
found, and the skin is a plain linear blend done in numpy. The mannequin itself is never drawn -- it
is the puppet inside him.

Writes a .blend the buffer pass opens with `blend`, so the material ids, the camera and the ground
row stay exactly those of the standing frames.

Run headless only:
    blender --background --python tools/blender/frank_hy3d_puppet.py -- <job.json>
"""

import json
import math
import os
import sys
import types

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import frank_hy3d_buffers as fhb  # noqa: E402

RIG_HEIGHT = 1.81       # the mannequin's crown, its head bone's tail
SPINE = ["pelvis", "spine", "chest", "neck", "head"]
ARM = ["clavicle", "upperarm", "forearm", "hand"]
LEG = ["thigh", "shin", "foot"]
FALLOFF = 4             # 1/d**FALLOFF: higher keeps each region on its own bones
SMOOTH = 12             # Laplacian passes over the mesh edges, so the joins do not crease or tear


def pose_rig(spritesmith):
    """spritesmith's rig module, loaded without running its own render."""
    path = os.path.join(spritesmith, "tools", "blender", "frank_pose_rig.py")
    with open(path, encoding="utf-8") as fh:
        src = fh.read().rsplit("\nmain()", 1)[0]
    mod = types.ModuleType("frank_pose_rig")
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


def rest_bones(fpr, k):
    """Every bone's parent and its rest segment, scaled from the mannequin's height to the scan's."""
    out = {}
    for name, (parent, h, t, sign) in fpr.REST.items():
        lat = sign * (fpr.LAT_ARM if ("arm" in name or "hand" in name or "clav" in name) else fpr.LAT_LEG)
        out[name] = (parent, np.array([h[0], lat, h[1]]) * k, np.array([t[0], lat, t[1]]) * k)
    return out


def affine(cos, sin, tx, tz):
    return np.array([[cos, -sin, tx], [sin, cos, tz], [0.0, 0.0, 1.0]])


def transforms(fpr, rest, pose, k):
    """Each bone's rigid move from rest to the pose, in the XZ plane, in the scan's units."""
    ang, offset = fpr.solve(pose)
    out = {}
    for name, (parent, h, t) in rest.items():
        turn = math.radians(ang[name]) - math.atan2(t[2] - h[2], t[0] - h[0])
        parent_m = out[parent] if parent else affine(1.0, 0.0, offset[0] * k, offset[1] * k)
        head = parent_m @ np.array([h[0], h[2], 1.0])
        c, s = math.cos(turn), math.sin(turn)
        out[name] = affine(c, s, 0, 0) @ affine(1, 0, -h[0], -h[2])
        out[name][0, 2] += head[0]
        out[name][1, 2] += head[1]
    return out


def segment_distance(co, head, tail):
    d = tail - head
    t = np.clip(((co - head) @ d) / max(float(d @ d), 1e-9), 0.0, 1.0)
    return np.linalg.norm(co - (head + t[:, None] * d), axis=1)


def regions(co):
    """Arm and leg masks, the same rule the colour pass splits its regions by."""
    zmin, zmax = co[:, 2].min(), co[:, 2].max()
    span = zmax - zmin
    half = max(abs(co[:, 1].min()), abs(co[:, 1].max()))
    high = co[:, 2] > zmin + fhb.HEM * span
    arm = (np.abs(co[:, 1]) > fhb.ARM_OUT * half) & high
    return arm, ~arm & ~high


def weights(obj, rest, names, mat):
    """One weight per bone per vertex: inverse distance inside the vertex's own region, smoothed."""
    me = obj.data
    nv = len(me.vertices)
    co = np.empty(nv * 3, np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3).astype(np.float64)
    arm, leg = regions(co)
    left = co[:, 1] > 0
    w = np.zeros((nv, len(names)))
    for i, name in enumerate(names):
        stem, _, side = name.partition(".")
        if stem in ARM:
            allowed = arm & (left if side == "L" else ~left)
            if stem == "hand":
                # his sleeves are rolled to the elbow, so no jacket belongs on a fist: left on the
                # hand bone, the jacket's side panel by the hip rides out with the punch as a blob
                allowed = allowed & (mat != fhb.JACKET)
        elif stem in LEG:
            allowed = leg & (left if side == "L" else ~left)
        else:
            allowed = ~arm & (~leg | (stem == "pelvis"))
        if not allowed.any():
            continue
        d = segment_distance(co[allowed], rest[name][1], rest[name][2])
        w[allowed, i] = 1.0 / np.maximum(d, 0.01) ** FALLOFF
    w /= np.maximum(w.sum(1), 1e-12)[:, None]
    ev = np.empty(len(me.edges) * 2, np.int64)
    me.edges.foreach_get("vertices", ev)
    ev = ev.reshape(-1, 2)
    for _ in range(fhb.JOB.get("smooth", SMOOTH)):
        acc = w * 2.0
        count = np.full(nv, 2.0)
        np.add.at(acc, ev[:, 0], w[ev[:, 1]])
        np.add.at(acc, ev[:, 1], w[ev[:, 0]])
        np.add.at(count, ev[:, 0], 1.0)
        np.add.at(count, ev[:, 1], 1.0)
        w = acc / count[:, None]
    return co, w


def skin(obj, co, w, mats, names):
    """Linear blend skinning: the blended affine per vertex, applied in the XZ plane."""
    M = np.stack([mats[n] for n in names])
    blended = np.einsum("vb,bij->vij", w, M)
    p = np.stack([co[:, 0], co[:, 2], np.ones(len(co))], 1)
    moved = np.einsum("vij,vj->vi", blended, p)
    out = np.column_stack([moved[:, 0], co[:, 1], moved[:, 1]])
    obj.data.vertices.foreach_set("co", out.astype(np.float32).ravel())
    obj.data.update()
    return float(np.abs(out - co).max())


def main():
    job = fhb.JOB
    out = job["out"]
    os.makedirs(out, exist_ok=True)
    obj, _, _, _ = fhb.prepared(job["glb"], job["sheet"])
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    # the scan faces the camera and the mannequin faces its own +X, so he turns a quarter to meet it
    obj.rotation_mode = "XYZ"
    obj.rotation_euler = (0.0, 0.0, math.radians(90))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    fpr = pose_rig(job["spritesmith"])
    k = fhb.HEIGHT_M / RIG_HEIGHT
    rest = rest_bones(fpr, k)
    names = list(rest)
    wanted = job.get("pose", "contact")
    pose = next(p for p in fpr.POSES if p["name"] == wanted)
    mats = transforms(fpr, rest, pose, k)
    co, w = weights(obj, rest, names)
    shift = skin(obj, co, w, mats, names)
    blend = os.path.join(out, "frank-%s.blend" % wanted)
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print("PUPPET " + json.dumps({"blend": blend, "pose": wanted, "bones": len(names),
                                  "verts": len(obj.data.vertices), "moved_m": round(shift, 4)}))


main()
