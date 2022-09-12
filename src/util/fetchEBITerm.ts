import { OntologyId, EBIOlsTerm, EBIOlsTermAPIResponse } from "../types/d";

const EBIBaseUrl = "https://www.ebi.ac.uk/ols/api";

/*
 * Cache
 */
const responseCache = new Map<OntologyId, EBIOlsTerm[]>();
const MaxResponseCacheSize = 10000;
function pruneCache(cache: Map<OntologyId, EBIOlsTerm[]>): void {
  if (cache.size > MaxResponseCacheSize) {
    /* Least recent insertion deletion */
    cache.delete(cache.keys().next().value);
  }
}

/**
 * Lookup a term in EBS OLS by Term OBO ID. Return the
 * result from the _defining_ ontology. Because OBO IDs are
 * not guaranteed to be unique, returns an array (usually
 * with a single element, but not always).
 *
 * Returns empty array if term is unknown.
 *
 * @param termId - term OBO ID
 * @returns array of term definition
 */
export async function olsLookupTermByOboId(oboId: OntologyId): Promise<EBIOlsTerm[]> {
  if (responseCache.has(oboId)) {
    return responseCache.get(oboId) as EBIOlsTerm[];
  }

  const [ontologyName] = oboId.split(":");
  const response = await fetch(`${EBIBaseUrl}/ontologies/${ontologyName}/terms?obo_id=${oboId}`, {
    headers: { Accept: "application/json" },
  });

  if (response.ok) {
    const r: EBIOlsTermAPIResponse = await response.json();
    responseCache.set(oboId, r._embedded.terms);
    pruneCache(responseCache);
    return r._embedded.terms;
  }

  if (response.status === 404) return []; // unknown term

  // real error
  throw new Error(`HTTP error, status: ${response.status}`);
}
