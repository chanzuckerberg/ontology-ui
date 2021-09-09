import React from "react";
import { Vertex } from "../d";
import _ from "lodash";

interface IProps {
  data: Vertex[];
}

interface IState {}

class Ontology extends React.Component<IProps, IState> {
  render() {
    const { data } = this.props;
    console.log("show data", data);
    return (
      <div>
        {_.map(data, (d, i) => {
          return (
            <p
              key={i}
              style={{
                margin: "none",
                padding: "none",
                fontSize: 10,
                lineHeight: 0,
              }}
            >
              {d.label}
            </p>
          );
        })}
      </div>
    );
  }
}

export default Ontology;
