/*
 * Forced local-device downloads.
 *
 * `jsPDF.save()` hands the file to the browser's own PDF handling, which in
 * Chrome often means "open in a new tab" instead of writing to the device.
 * Going through a Blob + an anchor carrying the `download` attribute makes the
 * browser write the file to local storage every time.
 */

/** Save any Blob to the device under `filename`. Returns false if the browser refused. */
export function downloadBlob(blob, filename) {
  if (!blob) return false;
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;          // the attribute that forces a save instead of a tab
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Revoke on the next frame so the download has started before the URL dies
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
    return true;
  } catch {
    return false;
  }
}

/** Save a jsPDF document to the device (never a preview tab). */
export function savePdf(doc, filename) {
  try {
    return downloadBlob(doc.output('blob'), filename);
  } catch {
    try { doc.save(filename); return true; } catch { return false; }   // last-resort fallback
  }
}

/** Save an API response fetched with `responseType: 'blob'`. */
export function saveApiFile(response, filename) {
  const data = response?.data;
  if (!data) return false;
  const type = response.headers?.['content-type'] || 'application/octet-stream';
  return downloadBlob(data instanceof Blob ? data : new Blob([data], { type }), filename);
}
