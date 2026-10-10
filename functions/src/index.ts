import { initializeApp } from "firebase-admin/app";

initializeApp();

export { publicPages } from "./publicPages.js";
export { api } from "./api.js";
export { onUserCreated } from "./triggers/onUserCreated.js";
export { onAppWrite } from "./triggers/onAppWrite.js";
