"use client";

import { Stage, type LookTokens } from "./kit/stage";
import { Window } from "./kit/window";
import type { Act, Script } from "./kit/act";
import "./walkthrough.css";

// One scene per step of a first booking. Words come from ServiceStore,
// OrderRooms and local-store, so the walkthrough reads as Qualty itself.

export type Scene = 0 | 1 | 2 | 3;

export interface WalkState {
  scene: Scene;
  port: string;
  rows: boolean;
  booked: boolean;
  reference: string;
  payment: "due" | "waiting" | "confirmed";
  messages: number;
  flag: boolean;
  issued: boolean;
  code: string;
  verified: boolean;
}

const REFERENCE = "UTR 4021 7733 9810";
const CERT_NUMBER = "COQ-2026-0001-7F3A";
const CHECK_CODE = "K7QD-M2XP";

const BLANK: Omit<WalkState, "scene"> = {
  port: "",
  rows: false,
  booked: false,
  reference: "",
  payment: "due",
  messages: 0,
  flag: false,
  issued: false,
  code: "",
  verified: false,
};

/** State at the start of a scene. */
export function opening(scene: Scene): WalkState {
  if (scene === 0) return { ...BLANK, scene };
  if (scene === 1) return { ...BLANK, scene, port: "Mundra", rows: true, booked: true };
  if (scene === 2) return { ...BLANK, scene, payment: "confirmed", messages: 1 };
  return { ...BLANK, scene, payment: "confirmed", messages: 3, flag: true };
}

/** State once a scene has played out: the still for reduced motion and pause. */
export function settled(scene: Scene): WalkState {
  if (scene === 0) return { ...BLANK, scene, port: "Mundra", rows: true };
  if (scene === 1) return { ...BLANK, scene, reference: REFERENCE, payment: "confirmed" };
  if (scene === 2) return { ...BLANK, scene, payment: "confirmed", messages: 3, flag: true };
  return { ...BLANK, scene, issued: true, code: CHECK_CODE, verified: true };
}

async function playScene(act: Act<WalkState>, scene: Scene) {
  await act.set(opening(scene));
  act.mark(`scene-${scene}`);
  await act.wait(500);
  if (scene === 0) {
    await act.click("port");
    await act.set({ port: "Mundra" });
    await act.wait(350);
    await act.set({ rows: true });
    await act.wait(900);
    await act.click({ at: "book", x: 0.78, y: 0.68 });
    await act.set({ booked: true });
    await act.wait(1100);
  } else if (scene === 1) {
    await act.click("reference");
    await act.type("reference", REFERENCE, { interval: 45 });
    await act.wait(300);
    await act.click({ at: "paid", x: 0.78, y: 0.68 });
    await act.set({ payment: "waiting" });
    await act.wait(1500);
    await act.set({ payment: "confirmed" });
    await act.wait(1800);
  } else if (scene === 2) {
    for (let n = 2; n <= 3; n++) {
      await act.set({ messages: n });
      await act.wait(900);
    }
    await act.set({ flag: true });
    await act.wait(2200);
  } else {
    await act.set({ issued: true });
    await act.wait(900);
    await act.click("verify-field");
    await act.type("code", CHECK_CODE, { interval: 60 });
    await act.wait(250);
    await act.click({ at: "verify", x: 0.78, y: 0.68 });
    await act.set({ verified: true });
    await act.wait(2200);
  }
}

/** Plays every scene once from `start`, telling the host which one is on. */
export function walkScript(start: Scene, onScene: (s: Scene) => void): Script<WalkState> {
  return async (act) => {
    for (let i = 0; i < 4; i++) {
      const scene = ((start + i) % 4) as Scene;
      onScene(scene);
      await playScene(act, scene);
    }
  };
}

// Qualty's tokens from globals.css, so the scene follows light and dark.
const TOKENS: LookTokens = {
  "--ss-canvas": "var(--bg-subtle)",
  "--ss-surface": "var(--bg-card)",
  "--ss-raised": "var(--bg-elevated)",
  "--ss-well": "var(--bg-inset)",
  "--ss-chrome": "var(--bg-subtle)",
  "--ss-line": "var(--border-main)",
  "--ss-line-faint": "var(--border-main)",
  "--ss-text-strong": "var(--text-main)",
  "--ss-text": "var(--text-secondary)",
  "--ss-text-faint": "var(--text-muted)",
  "--ss-accent": "var(--accent-primary)",
  "--ss-accent-soft": "var(--accent-light)",
  "--ss-font": "var(--sans)",
};

const PATHS = ["qualty.ai/#services", "qualty.ai/orders", "qualty.ai/rooms", "qualty.ai/vault"];

function StoreScene({ s }: { s: WalkState }) {
  return (
    <div className="qx-pane">
      <div className="qx-eyebrow">Service store</div>
      <div className="qx-title">Pre-Shipment Inspection (PSI)</div>
      <div className="qx-pick">
        <span className="qx-select" data-target="port" data-cursor="pointer">
          <span className="qx-muted">Port or city</span>
          <span className="qx-strong">{s.port || "All ports"}</span>
        </span>
        <span className="qx-select">
          <span className="qx-muted">Commodity</span>
          <span className="qx-strong">Rice</span>
        </span>
      </div>
      <div className="qx-list" data-show={s.rows || undefined}>
        <div className="qx-row qx-row--lead" data-on={s.booked || undefined}>
          <div className="qx-row-main">
            <span className="qx-strong">Mundra Cargo Surveyors</span>
            <span className="qx-verified">KYC checked</span>
            <span className="qx-muted">Mundra · Rice, Pulses · 2 days</span>
          </div>
          <div className="qx-price">
            <span className="qx-mono qx-strong">$780</span>
            <span className="qx-muted">per inspection</span>
          </div>
          <span className="qx-btn" data-target="book" data-cursor="pointer">
            Book now
          </span>
        </div>
        <div className="qx-row qx-row--faint">
          <span className="qx-bar" style={{ width: 170 }} />
          <span className="qx-bar" style={{ width: 60, marginLeft: "auto" }} />
        </div>
      </div>
      <div className="qx-note qx-muted">No price that fits? Raise an enquiry and companies send you bids.</div>
    </div>
  );
}

function PayScene({ s }: { s: WalkState }) {
  return (
    <div className="qx-pane">
      <div className="qx-eyebrow">Your order · PSI · Mundra</div>
      <div className="qx-invoice">
        <div className="qx-inv-head">
          <span className="qx-strong">Invoice INV-1042</span>
          <span className="qx-mono qx-strong">$780.00</span>
        </div>
        <div className="qx-muted">Pay by bank transfer or UPI, then enter the payment reference here.</div>
      </div>
      <div className="qx-pay">
          <span className="qx-field" data-target="reference" data-cursor="ibeam">
            {s.reference ? <span className="qx-mono">{s.reference}</span> : <span className="qx-muted">UTR or UPI reference</span>}
          </span>
          <span className="qx-btn" data-target="paid" data-cursor="pointer">
            I have paid
          </span>
      </div>
      <div className="qx-status" data-tone={s.payment}>
        {s.payment === "due" && "Waiting for payment"}
        {s.payment === "waiting" && `You sent payment reference ${s.reference}. The Qualty team confirms it, then the chatroom opens.`}
        {s.payment === "confirmed" && "Payment confirmed. Chatroom opened for the customer and the inspection company."}
      </div>
    </div>
  );
}

function RoomScene({ s }: { s: WalkState }) {
  return (
    <div className="qx-pane qx-room">
      <div className="qx-eyebrow">Order chatroom · Inspection in progress</div>
      <div className="qx-thread">
        <div className="qx-msg" data-show={s.messages >= 1 || undefined}>
          <span className="qx-meta">Inspector · 10:42</span>
          <span className="qx-bubble">
            <span className="qx-kind">Observation</span>
            Broken 4%
          </span>
        </div>
        <div className="qx-msg" data-show={s.messages >= 2 || undefined}>
          <span className="qx-meta">Inspector · 10:47</span>
          <span className="qx-bubble qx-bubble--media">
            <span className="qx-photo" aria-hidden="true" />
            <span className="qx-media-text">
              <span className="qx-kind">Evidence</span>
              Seal photo, container 3
            </span>
          </span>
        </div>
        <div className="qx-msg qx-msg--extra" data-show={s.messages >= 3 || undefined}>
          <span className="qx-meta">Inspector · 10:51</span>
          <span className="qx-bubble">
            <span className="qx-kind">Observation</span>
            Moisture 13.2%
          </span>
        </div>
        <div className="qx-flag" data-show={s.flag || undefined}>
          <span className="qx-strong">Flag</span>
          Broken 4% is above the booked 3%.
        </div>
      </div>
    </div>
  );
}

function CertScene({ s }: { s: WalkState }) {
  return (
    <div className="qx-pane qx-cert-pane">
      <div className="qx-cert" data-show={s.issued || undefined}>
        <span className="qx-eyebrow">Certificate of Quality</span>
        <span className="qx-mono qx-cert-no">{CERT_NUMBER}</span>
        <span className="qx-muted qx-cert-what">Pre-Shipment Inspection · Mundra · Rice</span>
        <span className="qx-cert-code">
          <span className="qx-muted">Check code</span>
          <span className="qx-mono qx-strong">{CHECK_CODE}</span>
        </span>
      </div>
      <div className="qx-verify">
        <span className="qx-strong">Check a certificate</span>
        <div className="qx-pay">
          <span className="qx-field" data-target="verify-field" data-cursor="ibeam">
            {s.code ? <span className="qx-mono">{s.code}</span> : <span className="qx-muted">Certificate number or check code</span>}
          </span>
          <span className="qx-btn qx-btn--quiet" data-target="verify" data-cursor="pointer">
            Verify
          </span>
        </div>
        <div className="qx-status" data-tone={s.verified ? "confirmed" : "idle"}>
          {s.verified ? `Valid · ${CERT_NUMBER} · issued` : "Anyone holding the certificate can check it."}
        </div>
      </div>
    </div>
  );
}

// Scenes that are not on screen hold their finished state, so the outgoing one fades as it ended.
const SETTLED = [settled(0), settled(1), settled(2), settled(3)] as const;

export function WalkthroughStage({
  initial,
  poster,
  script,
}: {
  initial: WalkState;
  poster: WalkState;
  script?: Script<WalkState>;
}) {
  return (
    <Stage<WalkState>
      width={960}
      height={440}
      compact={{ below: 640, width: 358, height: 340 }}
      initial={initial}
      poster={poster}
      script={script}
      play={script ? "loop" : undefined}
      tokens={TOKENS}
      cursor={{ at: { wide: { x: 900, y: 400 }, compact: { x: 330, y: 320 } }, ripple: true }}
      className="qx-stage"
    >
      {(s, _rect, layout) => (
        <Window url={PATHS[s.scene]} className="qx-window" data-layout={layout}>
          <div className="qx-scenes">
            <div className="qx-scene" data-show={s.scene === 0 || undefined}>
              <StoreScene s={s.scene === 0 ? s : SETTLED[0]} />
            </div>
            <div className="qx-scene" data-show={s.scene === 1 || undefined}>
              <PayScene s={s.scene === 1 ? s : SETTLED[1]} />
            </div>
            <div className="qx-scene" data-show={s.scene === 2 || undefined}>
              <RoomScene s={s.scene === 2 ? s : SETTLED[2]} />
            </div>
            <div className="qx-scene" data-show={s.scene === 3 || undefined}>
              <CertScene s={s.scene === 3 ? s : SETTLED[3]} />
            </div>
          </div>
        </Window>
      )}
    </Stage>
  );
}
