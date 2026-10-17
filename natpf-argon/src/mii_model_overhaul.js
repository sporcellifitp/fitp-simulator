import * as l from "three";
let g = null;
export function createDoubleRingShadowTexture() {
  if (g) return g;
  if (typeof document > "u") return null;
  const t = document.createElement("canvas");
  (t.width = 256), (t.height = 256);
  const o = t.getContext("2d"),
    s = 128,
    a = 128,
    r = o.createRadialGradient(s, a, 10, s, a, 118);
  r.addColorStop(0, "rgba(8, 22, 6, 0.84)"),
    r.addColorStop(0.38, "rgba(10, 26, 8, 0.62)"),
    r.addColorStop(0.68, "rgba(12, 30, 10, 0.26)"),
    r.addColorStop(0.84, "rgba(14, 34, 12, 0.12)"),
    r.addColorStop(1, "rgba(14, 34, 12, 0.0)"),
    (o.fillStyle = r),
    o.fillRect(0, 0, 256, 256),
    o.save(),
    o.beginPath(),
    o.arc(s, a, 92, 0, Math.PI * 2),
    (o.strokeStyle = "rgba(8, 24, 6, 0.16)"),
    (o.lineWidth = 8),
    o.stroke(),
    o.restore();
  const i = new l.CanvasTexture(t);
  return (
    "colorSpace" in i && l.SRGBColorSpace && (i.colorSpace = l.SRGBColorSpace),
    (i.needsUpdate = !0),
    (g = i),
    i
  );
}
function p(t, { rimStrength: o = 0.28, topBoost: s = 0.1 } = {}) {
  if (!t || t.userData?.wiiRimInjected) return t;
  (t.userData = t.userData || {}),
    (t.userData.wiiRimInjected = !0),
    (t.userData.rimStrength = o),
    (t.userData.topBoost = s);
  const a = `wii_mii_satin_rim_v1_${o.toFixed(2)}_${s.toFixed(2)}`;
  return (
    (t.customProgramCacheKey = () => a),
    (t.onBeforeCompile = (r) => {
      r.fragmentShader = r.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
      // Nintendo Wii Sports Rim-Lighting + Hemisphere Top-Light Boost
      vec3 wiiViewDir = normalize( vViewPosition );
      vec3 wiiNormal = normalize( vNormal );
      float wiiRim = pow( 1.0 - max( dot( wiiNormal, wiiViewDir ), 0.0 ), 2.6 ) * ${o.toFixed(3)};
      float wiiHemiTop = clamp( wiiNormal.y * 0.5 + 0.5, 0.0, 1.0 ) * ${s.toFixed(3)};
      vec3 wiiRimTint = vec3( 1.0, 0.985, 0.94 );
      outgoingLight += wiiRimTint * wiiRim + diffuseColor.rgb * wiiHemiTop;
      #include <opaque_fragment>
      `,
      );
    }),
    (t.needsUpdate = !0),
    t
  );
}
function h(t, o = "", s = "player") {
  if (!t) return t;
  const a = t.clone(),
    r = `${t.name || ""} ${o || ""}`;
  let i = 0.38,
    e = 0.04,
    n = 0.28,
    m = 0.1;
  return (
    /EyeDark|EyePupil|EyeLash/i.test(r)
      ? ((i = 0.12), (e = 0.06), (n = 0.18), (m = 0.04))
      : /EyeHighlight|EyeWhite/i.test(r)
        ? ((i = 0.16),
          (e = 0.02),
          (n = 0.22),
          (m = 0.12),
          a.emissive &&
            (a.emissive.setHex(16777215), (a.emissiveIntensity = /Highlight/i.test(r) ? 0.22 : 0.08)))
        : /Skin|Ear|Nose|Neck|Hand|Mitt|Thumb|Ankle/i.test(r)
          ? ((i = 0.36),
            (e = 0.02),
            (n = 0.34),
            (m = 0.28),
            a.emissive && (a.emissive.setHex(16754812), (a.emissiveIntensity = 0.22)))
          : /Shirt|Polo|Shorts|Leg|Headband/i.test(r)
            ? ((i = 0.42), (e = 0.04), (n = 0.28), (m = 0.11))
            : /Visor|Shoe|Stripe|White|Collar|Button|Wristband|Sock|Teeth/i.test(r)
              ? ((i = 0.32), (e = 0.05), (n = 0.28), (m = 0.1))
              : /Hair|Eyebrow/i.test(r) && ((i = 0.38), (e = 0.04), (n = 0.28), (m = 0.09)),
    (a.roughness = i),
    (a.metalness = e),
    (a.envMapIntensity = 1.08),
    p(a, { rimStrength: n, topBoost: m }),
    (a.userData.role = s),
    a
  );
}
export function upgradeMiiCharacterMaterials(t, o = "player") {
  if (!t) return;
  const s = !!(t.model || t.root),
    a = s ? t.model : t,
    r = o || (s && t.role) || "player";
  if (a && typeof a.traverse == "function") {
    const i = new Map();
    a.traverse((e) => {
      if (!e.isMesh) return;
      (e.castShadow = !0), (e.receiveShadow = !0);
      let n = /Torso/i.test(e.name || ""),
        m = e.parent;
      for (; m && !n; ) /Torso/i.test(m.name || "") && (n = !0), (m = m.parent);
      const d = Array.isArray(e.material)
        ? e.material.map((u) => u?.name || "").join(" ")
        : e.material?.name || "";
      if (n && /Skin/i.test(d) && e.geometry?.attributes?.position && !e.geometry.userData?.armNubsTucked) {
        e.geometry = e.geometry.clone();
        const u = e.geometry.attributes.position;
        for (let f = 0; f < u.count; f++) u.getY(f) > 0 && u.setXYZ(f, 0, 0.2, 0);
        (u.needsUpdate = !0),
          (e.geometry.userData = e.geometry.userData || {}),
          (e.geometry.userData.armNubsTucked = !0);
      }
      e.geometry &&
        (e.geometry.attributes.normal
          ? e.geometry.index !== null &&
            !e.geometry.userData?.normalsVerified &&
            (typeof e.geometry.normalizeNormals == "function" && e.geometry.normalizeNormals(),
            (e.geometry.userData = e.geometry.userData || {}),
            (e.geometry.userData.normalsVerified = !0))
          : e.geometry.computeVertexNormals());
      const y = (u) => {
        if (!u) return u;
        const f = `${u.uuid}_${r}`;
        return i.has(f) || i.set(f, h(u, e.name, r)), i.get(f);
      };
      Array.isArray(e.material)
        ? (e.material = e.material.map(y))
        : e.material && (e.material = y(e.material));
    });
  }
  s && (t.racketMesh && upgradeRacketMaterials(t.racketMesh), t.shadowBlob && upgradeCharacterShadowBlob(t));
}
export function upgradeRacketMaterials(t) {
  if (!t) return;
  const o = t.racketMesh ? t.racketMesh : t;
  if (!o || typeof o.traverse != "function") return;
  const s = new Map();
  o.traverse((a) => {
    if (!a.isMesh) return;
    (a.castShadow = !0),
      (a.receiveShadow = !0),
      a.geometry && !a.geometry.attributes.normal && a.geometry.computeVertexNormals();
    const r = (i) => {
      if (!i) return i;
      if (s.has(i.uuid)) return s.get(i.uuid);
      const e = i.clone(),
        n = `${i.name || ""} ${a.name || ""}`;
      return (
        /String/i.test(n)
          ? ((e.roughness = 0.18),
            (e.metalness = 0.05),
            e.emissive && (e.emissive.setHex(16777215), (e.emissiveIntensity = 0.34)),
            p(e, { rimStrength: 0.24, topBoost: 0.12 }))
          : /Silver/i.test(n)
            ? ((e.roughness = 0.18), (e.metalness = 0.78), p(e, { rimStrength: 0.3, topBoost: 0.1 }))
            : /Blue|Throat|Hoop/i.test(n)
              ? ((e.roughness = 0.22), (e.metalness = 0.62), p(e, { rimStrength: 0.28, topBoost: 0.1 }))
              : /Red|Cyan|Stripe/i.test(n)
                ? ((e.roughness = 0.24), (e.metalness = 0.38), p(e, { rimStrength: 0.26, topBoost: 0.1 }))
                : /Grip/i.test(n)
                  ? ((e.roughness = 0.56), (e.metalness = 0.04), p(e, { rimStrength: 0.18, topBoost: 0.06 }))
                  : ((e.roughness = 0.28), (e.metalness = 0.08), p(e, { rimStrength: 0.26, topBoost: 0.1 })),
        s.set(i.uuid, e),
        e
      );
    };
    Array.isArray(a.material) ? (a.material = a.material.map(r)) : a.material && (a.material = r(a.material));
  });
}
export function upgradeCharacterShadowBlob(t) {
  if (!t || !t.shadowBlob) return;
  const o = t.shadowBlob;
  if (o.userData?.wiiShadowUpgraded) return;
  (o.userData = o.userData || {}), (o.userData.wiiShadowUpgraded = !0);
  const s = o.material?.opacity ?? 0.82;
  o.userData.baseOpacity = s;
  const a = createDoubleRingShadowTexture();
  o.material && ((o.material = o.material.clone()), a && (o.material.map = a), (o.material.needsUpdate = !0));
  const r = new l.RingGeometry(0.42, 0.58, 36);
  r.rotateX(-Math.PI / 2);
  const i = new l.MeshBasicMaterial({
      color: 662536,
      transparent: !0,
      opacity: 0.16,
      side: l.DoubleSide,
      depthWrite: !1,
    }),
    e = new l.Mesh(r, i);
  (e.position.y = 0.002), (e.renderOrder = o.renderOrder || 2), o.add(e), (o.userData.haloMesh = e);
}
export function updateCharacterContactShadow(t, o = void 0) {
  if (!t || !t.shadowBlob) return;
  t.shadowBlob.userData?.wiiShadowUpgraded || upgradeCharacterShadowBlob(t);
  const s = t.shadowBlob,
    a = typeof o == "number" ? Math.max(0, o) : Math.max(0, (t.root?.position?.y || 0) - (t.pos?.y || 0));
  t.pos && ((s.position.x = t.pos.x), (s.position.z = t.pos.z));
  const r = s.userData?.baseOpacity ?? 0.82,
    i = l.MathUtils.clamp(1.03 - a * 0.68, 0.72, 1.06);
  s.scale.setScalar(i), s.material && (s.material.opacity = l.MathUtils.clamp(r * (1 - a * 1.12), 0.38, r));
  const e = s.userData?.haloMesh;
  if (e && e.material) {
    const n = l.MathUtils.clamp(1 + a * 0.75, 1, 1.28);
    e.scale.setScalar(n), (e.material.opacity = l.MathUtils.clamp(0.16 * (1 - a * 1.35), 0.04, 0.18));
  }
}
