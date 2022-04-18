import { useState, useEffect } from "react";
import load from "../util/load";

export default function DiscoveryLog() {
  const [log, setLog] = useState<any>(null);

  useEffect(() => {
    load("/discoveryLog.json")
      .then((l) => setLog(l.releases))
      .catch(() => setLog(null));
  }, []);

  return (
    <div>
      <h1>discovery log</h1>

      {log &&
        log.map((update: any, i: number) => {
          return (
            <div key={i}>
              <h3> {update.date}</h3>
              <ol>
                {update.terms.diffReport.newClasses.newClass.map((term: any, ii: number) => {
                  return <li key={ii}>{term.classLabel}</li>;
                })}
              </ol>
            </div>
          );
        })}
    </div>
  );
}
