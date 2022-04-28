import { Button, RadioGroup, Radio, Icon, ButtonGroup } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

interface Term {
  highlight: boolean;
  action: string; //include, exclude, none, so could be 'one of'
  match: string;
  compartment: string;
}

interface SearchSidebarProps {
  terms: Term[];
}

interface SearchTermProps {
  term: Term;
  marginUnit: number;
}

const SearchSidebar = (props: SearchSidebarProps) => {
  const { terms } = props;
  const marginUnit = 15;
  return (
    <div>
      <div style={{ marginBottom: marginUnit * 2 }}>
        <h2>Search & filter</h2>
        <p style={{ fontStyle: "italic" }}>Searches are execulted in the order they appear here.</p>
      </div>
      {terms.map((term) => {
        return <SearchTerm term={term} marginUnit={marginUnit} />;
      })}
      <input type="text" />
      <RadioGroup
        onChange={(d) => {
          console.log("search mode");
        }}
        selectedValue={"none"}
      >
        <Radio label={`compartment (e.g., eye, lung, UBERON:0002048)`} value="compartment" />
        <Radio label={`terms (e.g., b cell, neuron, CL:0000057)`} value="terms" />
        <Radio label={`terms and their children (e.g., b cell, neuron)`} value="terms and children" />
      </RadioGroup>

      <Button
        style={{ marginTop: marginUnit }}
        onClick={() => {
          console.log("for now, perhaps this just triggers xrefSearchIsOpen true");
        }}
        icon={<Icon icon="plus" iconSize={16} />}
      >
        Add search term
      </Button>
    </div>
  );
};

const SearchTerm = (props: SearchTermProps) => {
  const { term, marginUnit } = props;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15 }}>
      <div style={{ width: 290, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        <ButtonGroup>
          <Button
            onClick={() => {
              console.log("color by ", term.match, term.compartment);
            }}
            icon={<Icon icon="tint" iconSize={16} />}
          />

          <Popover2
            popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
            content={
              <RadioGroup
                onChange={(d) => {
                  console.log("graph action radio button selection");
                }}
                selectedValue={"none"}
              >
                <Radio label="none" value="none" />
                <Radio label={`keep nodes matching: ${term.match} ${term.compartment}`} value="keep graph to only" />
                <Radio label={`remove nodes matching: ${term.match} ${term.compartment}`} value="remove just this" />
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

        <span style={{ marginLeft: marginUnit, marginRight: marginUnit }}>
          {term.match}
          {term.compartment}
        </span>
      </div>
      <Button minimal icon={<Icon icon="delete" iconSize={16} />} />
    </div>
  );
};

export default SearchSidebar;
