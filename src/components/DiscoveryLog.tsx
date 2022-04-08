import React from "react";
import load from "../util/load";

interface IProps {}

interface IState {
  log: any;
}

class DiscoveryLog extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      log: null,
    };
  }
  async componentDidMount() {
    const log = await load("/discoveryLog.json");
    this.setState({ log: log.releases });
  }
  render() {
    const { log } = this.state;
    return (
      <div>
        <h1>discovery log</h1>

        {log &&
          log.map((update: any, i: number) => {
            return (
              <div key={i}>
                <h3> {update.date}</h3>
                <ol>
                  {update.terms.diffReport.newClasses.newClass.map(
                    (term: any, ii: number) => {
                      return <li key={ii}>{term.classLabel}</li>;
                    }
                  )}
                </ol>
              </div>
            );
          })}
      </div>
    );
  }
}

export default DiscoveryLog;
