const EBIBaseUrl = "https://www.ebi.ac.uk/ols/api/terms?id=";

/**
 * Lookup a term in EBS OLS by Term ID.
 *
 * @param termId - term ID
 * @returns term definition
 */
export default async function fetchEBITerm(termId: string) {
  const headers = {
    Accept: "application/json",
  };
  const response = await fetch(EBIBaseUrl + termId, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const parsedResponse = await response.json();
  return parsedResponse;
}
