import { BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

export const nominationMessage = (name: string, handle: string, wallet: string) => `Nominate: ${name} (@${handle}) by ${wallet}`;

/** Verifies a wallet signature: EIP-191 for 0x addresses, ed25519 for Solana. */
export function verifyWalletSignature(message: string, wallet: string, signature: string): void {
  // Local development only: lets the pipeline be exercised without a wallet. Never enabled by default.
  if (process.env.ALLOW_MOCK_SIGNATURES === 'true' && signature.startsWith('mock_')) return;

  if (wallet.startsWith('0x')) {
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch (err) {
      throw new BadRequestException('Failed to verify Ethereum wallet signature: ' + (err as Error).message);
    }
    if (recovered.toLowerCase() !== wallet.toLowerCase()) throw new BadRequestException('Ethereum signature does not match the submitter wallet');
    return;
  }

  try {
    const ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      new Uint8Array(Buffer.from(signature.replace(/^0x/, ''), 'hex')),
      bs58.decode(wallet),
    );
    if (!ok) throw new Error('signature mismatch');
  } catch (err) {
    throw new BadRequestException('Failed to verify Solana wallet signature: ' + (err as Error).message);
  }
}
