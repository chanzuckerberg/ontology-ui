export default async function loadOntologies(_ontologiesURL: string) {
  const _headers = new Headers();

  _headers.append("Content-Type", "application/json");
  _headers.append("Accept-Encoding", "gzip");

  const _request = new Request(_ontologiesURL, {
    method: "GET",
    headers: _headers,
    cache: "default",
  });

  const response = await fetch(_request);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const parsedResponse = await response.json();
  return parsedResponse;
}
