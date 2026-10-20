/**
 * GPU gate (build brief §4.5), run after first paint. Returns the tier; 'T0' means posters + SVG map.
 * ?gl=off → T0. ?gl=force or ?record → skip the probes.
 */
export type Tier = 'T0' | 'T1' | 'T2' | 'T3';

export async function gpuTier(): Promise<Tier> {
  const q = location.search;
  if (/[?&]gl=off/.test(q)) return 'T0';
  const forced = /[?&](gl=force|record)/.test(q);
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (!forced && nav.connection?.saveData) return 'T0';
  if (!forced) {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return 'T0';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    if (/SwiftShader|llvmpipe|softpipe|Basic Render|Microsoft Basic|software|Mesa OffScreen/i.test(name)) return 'T0';
    type Adapter = { info?: { isFallbackAdapter?: boolean }; isFallbackAdapter?: boolean } | null;
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu) {
      try {
        const a = (await gpu.requestAdapter()) as Adapter;
        if (a && (a.info?.isFallbackAdapter || a.isFallbackAdapter)) return 'T0';
      } catch {}
    }
  }
  const cores = navigator.hardwareConcurrency || 4;
  if ((nav.deviceMemory ?? 8) < 4 || cores < 4) return 'T3';
  if (innerWidth >= 1024 && cores >= 8) return 'T1';
  return 'T2';
}
