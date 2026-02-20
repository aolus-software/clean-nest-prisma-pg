/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import * as CryptoJS from "crypto-js";
import { getEnv } from "@config";

export class EncryptionUtils {
	private static readonly secretKey = getEnv().APP_SECRET;

	static encrypt(text: string): string {
		return CryptoJS.AES.encrypt(text, this.secretKey).toString() as string;
	}

	static decrypt(encryptedText: string): string {
		const bytes = CryptoJS.AES.decrypt(encryptedText, this.secretKey);
		return bytes.toString(CryptoJS.enc.Utf8) as string;
	}

	static encryptPassword(text: string, passPhrase: string): string {
		return CryptoJS.AES.encrypt(text, passPhrase).toString() as string;
	}

	static decryptPassword(encryptedText: string, passPhrase: string): string {
		const bytes = CryptoJS.AES.decrypt(encryptedText, passPhrase);
		return bytes.toString(CryptoJS.enc.Utf8) as string;
	}
}
