"use client";

import { useCallback, useMemo, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import { useReducedMotion } from "./kit/reduced-motion";
import { WalkthroughStage, opening, settled, walkScript } from "./WalkthroughStage";
import type { Scene } from "./WalkthroughStage";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Pick a service and port",
    body: "See every inspection company that covers it, with its price. Or raise an enquiry and get bids.",
  },
  {
    title: "Book and pay",
    body: "Pay the invoice by bank transfer or UPI. Once the Qualty team confirms it, the chatroom opens.",
  },
  {
    title: "Follow the inspection",
    body: "The inspector posts readings and photos. Anything outside your booked spec is flagged.",
  },
  {
    title: "Get the certificate",
    body: "A Certificate of Quality with a number and a check code anyone can verify.",
  },
];

export default function HowQualtyWorks() {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState<Scene>(0);
  // Bumped when the viewer picks a step, so the stage restarts from there.
  const [start, setStart] = useState<{ scene: Scene; n: number }>({ scene: 0, n: 0 });
  const [paused, setPaused] = useState(false);

  const still = reduced || paused;
  const onScene = useCallback((s: Scene) => setScene(s), []);
  const script = useMemo(() => walkScript(start.scene, onScene), [start, onScene]);

  const pick = (s: Scene) => {
    setScene(s);
    setStart((prev) => ({ scene: s, n: prev.n + 1 }));
  };

  const togglePause = () => {
    if (paused) setStart((prev) => ({ scene, n: prev.n + 1 }));
    setPaused(!paused);
  };

  return (
    <section id="how-it-works" className="section hqw" aria-labelledby="how-it-works-title">
      <div className="section-head">
        <span className="eyebrow">How it works</span>
        <h2 id="how-it-works-title">How Qualty works</h2>
        <p>From choosing a port to a certificate anyone can check, in four steps.</p>
      </div>

      <div className="hqw-body">
        <ol className="hqw-steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <button
                type="button"
                className="hqw-step"
                aria-pressed={scene === i}
                onClick={() => pick(i as Scene)}
              >
                <span className="hqw-num font-mono" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="hqw-text">
                  <span className="hqw-title">{step.title}</span>
                  <span className="hqw-copy">{step.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="hqw-demo">
          <div role="img" aria-label={`Walkthrough, step ${scene + 1} of 4: ${STEPS[scene].title}`}>
            <div aria-hidden="true">
              {still ? (
                <WalkthroughStage key={`still-${scene}`} initial={settled(scene)} poster={settled(scene)} />
              ) : (
                <WalkthroughStage
                  key={`play-${start.n}`}
                  initial={opening(start.scene)}
                  poster={settled(start.scene)}
                  script={script}
                />
              )}
            </div>
          </div>
          {!reduced && (
            <button type="button" className="hqw-pause" onClick={togglePause}>
              {paused ? <Play size={14} weight="bold" aria-hidden="true" /> : <Pause size={14} weight="bold" aria-hidden="true" />}
              {paused ? "Play" : "Pause"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .hqw-body {
          display: grid;
          grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
          gap: 32px;
          align-items: start;
        }
        .hqw-steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hqw-step {
          display: flex;
          gap: 12px;
          width: 100%;
          text-align: left;
          padding: 12px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
          transition: background-color 0.2s var(--ease-out), border-color 0.2s var(--ease-out);
        }
        .hqw-step:hover {
          background-color: var(--bg-card);
        }
        .hqw-step[aria-pressed="true"] {
          background-color: var(--bg-card);
          border-color: var(--border-main);
        }
        .hqw-step:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 2px;
        }
        .hqw-num {
          flex: none;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg-inset);
          color: var(--text-secondary);
          transition: background-color 0.2s var(--ease-out), color 0.2s var(--ease-out);
        }
        .hqw-step[aria-pressed="true"] .hqw-num {
          background: var(--accent-fill);
          color: #fff;
        }
        .hqw-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .hqw-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-main);
          line-height: 24px;
        }
        .hqw-copy {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .hqw-demo {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          min-width: 0;
        }
        .hqw-demo > div {
          width: 100%;
        }
        .hqw-pause {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          border-radius: 9999px;
          border: 1px solid var(--border-main);
          background: var(--bg-card);
          color: var(--text-secondary);
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }
        .hqw-pause:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 2px;
        }
        @media (max-width: 900px) {
          .hqw-body {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .hqw-demo {
            order: -1;
          }
        }
      `}</style>
    </section>
  );
}
