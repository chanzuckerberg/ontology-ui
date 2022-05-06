import { useState } from "react";
import { Button, RadioGroup, Radio, Icon, ButtonGroup, InputGroup, ControlGroup, HTMLSelect } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";
import memoizeOne from "memoize-one";

export type FilterMode = "none" | "keep" | "remove";
export type SearchMode = "compartment" | "celltype";
export interface SearchTerm {
  highlight: boolean;
  searchString: string;
  filterMode: FilterMode;
  searchMode: SearchMode;
}

interface SearchSidebarProps {
  searchTerms: SearchTerm[];
  setSearchTerms: (searches: SearchTerm[]) => void;
}

interface SearchTermProps {
  id: number;
  term: SearchTerm;
  marginUnit: number;
  onChange: (term: SearchTerm, key: number) => void;
  onDelete: (key: number) => void;
}

const SearchModes: { label: string; value: SearchMode }[] = [
  {
    label: `🫁 compartment`,
    value: "compartment",
  },
  {
    label: `cell type`,
    value: "celltype",
  },
];

const SearchSidebar = (props: SearchSidebarProps) => {
  const { searchTerms, setSearchTerms } = props;
  const marginUnit = 15;
  const [searchString, setSearchString] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("compartment");

  const handleSearchTermChange = (term: SearchTerm, id: number) => {
    const updatedSearchTerms = [...searchTerms];
    updatedSearchTerms[id] = term;
    setSearchTerms(updatedSearchTerms);
  };

  const handleSearchTermDelete = (id: number) => {
    const updatedSearchTerms = [...searchTerms];
    updatedSearchTerms.splice(id, 1);
    setSearchTerms(updatedSearchTerms);
  };

  return (
    <div>
      <div style={{ marginBottom: marginUnit * 2 }}>
        <h2>Search &amp; filter</h2>
        <p style={{ fontStyle: "italic" }}>
          Search &amp; add terms: a search might be a compartment (e.g., eye, lung, UBERON:0002048) or cell type (e.g.,
          T cell, neuron, CL:0000057).
        </p>
        <p style={{ fontStyle: "italic" }}>
          Use terms to modify the graph: they are executed in the order they appear.
        </p>
      </div>
      <ControlGroup fill style={{ marginBottom: marginUnit * 2 }}>
        <HTMLSelect
          value={searchMode}
          options={SearchModes}
          onChange={(e) => {
            setSearchMode(e.target.value as SearchMode);
          }}
        />
        <InputGroup
          placeholder="Search..."
          value={searchString}
          onChange={(e) => {
            setSearchString(e.target.value);
          }}
        />
        <Button
          icon="plus"
          disabled={!searchString}
          onClick={() => {
            setSearchTerms([...searchTerms, { highlight: true, searchString, searchMode, filterMode: "none" }]);
            setSearchString("");
          }}
        />
      </ControlGroup>
      {searchTerms.map((term, i) => {
        return (
          <SearchTermView
            key={i}
            id={i}
            term={term}
            marginUnit={marginUnit}
            onChange={handleSearchTermChange}
            onDelete={handleSearchTermDelete}
          />
        );
      })}
      <div style={{ marginTop: marginUnit * 3 }}></div>
    </div>
  );
};

const SearchTermView = (props: SearchTermProps) => {
  const { id, term, marginUnit, onDelete, onChange } = props;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15 }}>
      <div style={{ width: 290, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        <ButtonGroup>
          <Button
            onClick={() => onChange({ ...term, highlight: !term.highlight }, id)}
            icon={<Icon icon="tint" iconSize={16} />}
            active={term.highlight}
            intent={term.highlight ? "primary" : "none"}
          />

          <Popover2
            popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
            content={
              <RadioGroup
                onChange={(e) => onChange({ ...term, filterMode: e.currentTarget.value as FilterMode }, id)}
                selectedValue={term.filterMode}
              >
                <Radio label="none" value="none" />
                <Radio label={`keep nodes matching: ${term.searchString}`} value="keep" />
                <Radio label={`remove nodes matching: ${term.searchString}`} value="remove" />
              </RadioGroup>
            }
            placement={"bottom-end"}
          >
            <Button
              rightIcon={<Icon icon="caret-down" iconSize={16} />}
              icon={<Icon icon={"filter" /* set depending on selection */} iconSize={16} />}
            />
          </Popover2>
        </ButtonGroup>
        <span style={{ marginLeft: marginUnit, marginRight: marginUnit }}>{term.searchString}</span>
      </div>
      <Button minimal icon={<Icon icon="delete" iconSize={16} onClick={() => onDelete(id)} />} />
    </div>
  );
};

export function searchTermToUrlSearchParam(term: SearchTerm): string {
  const { highlight, searchString, searchMode, filterMode } = term;
  const highlightFlag = highlight ? "T" : "F";
  const searchFlag = searchMode === "celltype" ? "C" : "U";
  const filterFlag = filterMode === "none" ? "I" : filterMode === "keep" ? "K" : "R";
  return `${highlightFlag}${searchFlag}${filterFlag}${searchString}`;
}

export function urlSearchParamToSearchTerm(qstr: string): SearchTerm {
  const highlight: boolean = qstr[0] === "T";
  const searchMode: SearchMode = qstr[1] === "C" ? "celltype" : "compartment";
  const filterMode: FilterMode = qstr[2] === "I" ? "none" : qstr[2] === "K" ? "keep" : "remove";
  const searchString = qstr.slice(3);
  return { highlight, searchMode, filterMode, searchString };
}

export const urlSearchParamsToSearchTerms = memoizeOne(
  (paramStrings: string[]): SearchTerm[] => paramStrings.map(urlSearchParamToSearchTerm), 
  (first: [string[]], second: [string[]]) => first[0].join(';') === second[0].join(';'))

export function searchTermsToSearchQueries(terms: SearchTerm[]): string[] {
  return terms.map(searchTermToUrlSearchParam);
}

export default SearchSidebar;
