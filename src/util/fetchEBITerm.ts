// this needs to be proxied,
const ebiBaseUrl = "/terms?id=";

export default async function fetchEBITerm(vertex: string) {
  const _headers = new Headers();

  _headers.append("Content-Type", "application/json");
  _headers.append("Access-Control-Allow-Origin", "*");

  const _request = new Request(ebiBaseUrl + vertex, {
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
