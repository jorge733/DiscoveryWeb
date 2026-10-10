"use client";

import { useMemo } from "react";
import { BufferAttribute, Color, PlaneGeometry } from "three";
import { heightAt, mountainMask, TERRAIN } from "@/lib/terrain";

const MEADOW = new Color("#43592a");
const MEADOW_DRY = new Color("#4f5226");
const ROCK = new Color("#5e5a52");
const ROCK_DARK = new Color("#3a3833");
const SNOW = new Color("#eef1f4");

export function Terrain({ segments }: { segments: number }) {
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(TERRAIN.size, TERRAIN.size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, TERRAIN.centerZ);

    const pos = geo.attributes.position;
    const normals = geo.attributes.normal;
    const e = 0.6;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, heightAt(x, z));
      // Analytic normals from the height field shade far smoother than the mesh's facets.
      const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
      const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
      const len = Math.hypot(dx, 1, dz);
      normals.setXYZ(i, -dx / len, 1 / len, -dz / len);
    }

    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const slope = 1 - normals.getY(i); // 0 flat, 1 vertical
      const m = mountainMask(x, z);

      c.copy(MEADOW).lerp(MEADOW_DRY, Math.min(Math.max((Math.sin(x * 0.11) * Math.cos(z * 0.07) + 1) * 0.3, 0), 1));
      const rockiness = Math.min(Math.max(m * 1.6 + slope * 2.2 - 0.4, 0), 1);
      c.lerp(ROCK.clone().lerp(ROCK_DARK, slope), rockiness);
      const snow = Math.min(Math.max((y - 48) / 18, 0), 1) * Math.min(Math.max(1 - slope * 2.4, 0), 1);
      c.lerp(SNOW, snow);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
  }, [segments]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}
