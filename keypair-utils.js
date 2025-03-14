import { Keypair } from "@solana/web3.js";

import fs from "fs";
import path from "path";
import os from "os";

export async function loadKeypairFromFile(filePath) {
    const resolvedPath = path.resolve(
      filePath.startsWith("~")? filePath.replace("~", os.homedir()): filePath,
    );
    let loadedKeyBytes;
    try {
        loadedKeyBytes = new Uint8Array(JSON.parse(fs.readFileSync(resolvedPath, "utf8")));
    } catch (error) {
        console.error(`Failed to read keypair file at ${resolvedPath}:`, error);
        throw error;
    }
    const keypair = Keypair.fromSecretKey(loadedKeyBytes);
    return keypair;
}
