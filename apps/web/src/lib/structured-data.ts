/**
 * Serializes JSON-LD for insertion into an HTML script element.
 *
 * JSON.stringify alone is valid JSON but is not sufficient for an HTML context:
 * a string containing `</script>` could terminate the script element before the
 * browser parses the JSON. Escaping HTML-sensitive characters keeps the data
 * inside the JSON-LD script while preserving its JSON meaning.
 */
export function serializeJsonLd(value: unknown): string {
  return (JSON.stringify(value) ?? "")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
