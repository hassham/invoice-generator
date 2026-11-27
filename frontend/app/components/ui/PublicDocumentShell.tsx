import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./PublicDocument.module.css";

export function PublicDocumentShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <Link href="/" aria-label="Bevorly home" className={styles.wordmark}>
            <Image src="/brand/bevorly-mark.svg" alt="" width={28} height={28} unoptimized />
            bevorly.
          </Link>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </>
  );
}
