import { Button, RadioGroup, Radio, Icon, ButtonGroup, InputGroup, ControlGroup, HTMLSelect } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

interface Term {
  highlight: boolean;
  action: string; //include, exclude, none, so could be 'one of'
  searchString: string;
  searchMode: string;
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
        <p style={{ fontStyle: "italic" }}>
          Search & add terms: a search might be a compartment (e.g., eye, lung, UBERON:0002048) or cell type (e.g., T
          cell, neuron, CL:0000057).
        </p>
        <p style={{ fontStyle: "italic" }}>
          Use terms to modify the graph: they are executed in the order they appear.
        </p>
      </div>
      <ControlGroup fill style={{ marginBottom: marginUnit * 2 }}>
        <HTMLSelect options={[`🫁 compartment`, `cell type`]} />
        <InputGroup placeholder="Search..." />
        <Button
          icon="plus"
          onClick={(e) => {
            console.log("add term", e.target);
          }}
        />
      </ControlGroup>
      {terms.map((term, i) => {
        return <SearchTerm key={i} term={term} marginUnit={marginUnit} />;
      })}
      <div style={{ marginTop: marginUnit * 3 }}></div>
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
              console.log("color by ", term.searchString);
            }}
            icon={<Icon icon="tint" iconSize={16} />}
          />

          <Popover2
            popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
            content={
              <RadioGroup
                onChange={(e) => {
                  console.log("change graph: ", e.currentTarget.value, term.searchString);
                }}
                selectedValue={"none"}
              >
                <Radio label="none" value="none" />
                <Radio label={`keep nodes matching: ${term.searchString}`} value="keep only term" />
                <Radio label={`remove nodes matching: ${term.searchString}`} value="remove term" />
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
      <Button
        minimal
        icon={
          <Icon
            icon="delete"
            iconSize={16}
            onClick={() => {
              console.log("remove term ", term.searchString);
            }}
          />
        }
      />
    </div>
  );
};

export default SearchSidebar;
