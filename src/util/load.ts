export default async function load(url: string) {
  const headers = { Accept: "application/json" };
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const parsedResponse = await response.json();
  return parsedResponse;
}
