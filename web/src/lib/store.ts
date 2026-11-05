// One entry point for every screen. With Supabase keys set (production) data lives in the
// Qualty Supabase project; without them (tests, local demo) it stays in this browser.
// Every write returns a Promise so screens behave the same in both modes.

import * as L from "./local-store";
import * as R from "./remote-store";
import { isRemote } from "./supabase";

export * from "./local-store";
export { isRemote };
export type { Session } from "./remote-store";

function pick<F extends (...a: never[]) => unknown>(local: F, remote: (...a: Parameters<F>) => Promise<Awaited<ReturnType<F>>>) {
  return (...a: Parameters<F>): Promise<Awaited<ReturnType<F>>> =>
    isRemote ? remote(...a) : Promise.resolve(local(...a) as Awaited<ReturnType<F>>);
}

export const useDB: () => L.DB = isRemote ? R.useRemoteDB : L.useDB;

const noSession = () => ({ session: null as R.Session | null, ready: true });
/** The signed-in user. Always null in browser-only mode, where roles are picked by hand. */
export const useSession: () => { session: R.Session | null; ready: boolean } = isRemote ? R.useRemoteSession : noSession;

export const signUp = R.signUp;
export const signIn = R.signIn;
export const signOut = R.signOut;
export const myCompanyIds = R.myCompanyIds;

export const saveSpec = pick(L.saveSpec, R.saveSpec);
export const deleteSpec = pick(L.deleteSpec, R.deleteSpec);
export const createOrder = pick(L.createOrder, R.createOrder);
export const setPartyVerified = pick(L.setPartyVerified, R.setPartyVerified);
export const submitBid = pick(L.submitBid, R.submitBid);
export const acceptBid = pick(L.acceptBid, R.acceptBid);
export const counterBid = pick(L.counterBid, R.counterBid);
export const discountBid = pick(L.discountBid, R.discountBid);
export const setFollowUp = pick(L.setFollowUp, R.setFollowUp);
export const withdrawBid = pick(L.withdrawBid, R.withdrawBid);
export const postMessage = (msg: Omit<L.ChatMessage, "id" | "createdAt">): Promise<void> =>
  isRemote ? R.postMessage(msg) : Promise.resolve(void L.postMessage(msg));
export const addEvidence = isRemote ? R.addEvidence : L.addEvidence;
export const completeInspection = pick(L.completeInspection, R.completeInspection);
export const getBlob = isRemote ? R.getBlob : L.getBlob;

export const createCompany = pick(L.createCompany, R.createCompany);
export const updateCompany = pick(L.updateCompany, R.updateCompany);
export const inviteMember = pick(L.inviteMember, R.inviteMember);
export const setMemberRole = pick(L.setMemberRole, R.setMemberRole);
export const activateMember = pick(L.activateMember, R.activateMember);
export const removeMember = pick(L.removeMember, R.removeMember);
export const addKycDoc = isRemote ? (c: string, t: L.KycDocType, f: File) => R.addKycDoc(c, t, f) : (c: string, t: L.KycDocType, f: File) => L.addKycDoc(c, t, f).then(() => {});
export const reviewKycDoc = pick(L.reviewKycDoc, R.reviewKycDoc);

export const saveListing = pick(L.saveListing, R.saveListing);
export const deleteListing = pick(L.deleteListing, R.deleteListing);
export const raiseInvoice = pick(L.raiseInvoice, R.raiseInvoice);
export const recordPayment = pick(L.recordPayment, R.recordPayment);

export const issueCertificate = isRemote ? R.issueCertificate : L.issueCertificate;
export const revokeCertificate = pick(L.revokeCertificate, R.revokeCertificate);
export const checkCertificate = (code: string): Promise<L.CertCheck> =>
  isRemote ? R.checkCertificate(code) : Promise.resolve(L.checkCertificate(code));
export const addCompliance = isRemote ? R.addCompliance : L.addCompliance;
export const removeCompliance = pick(L.removeCompliance, R.removeCompliance);
