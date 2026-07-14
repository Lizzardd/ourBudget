/**
 * A black box for startup crashes.
 *
 * When an OTA update dies on launch, expo-updates does exactly the right thing:
 * it marks the update failed and rolls back to the embedded bundle. The user
 * gets a working app. What nobody gets is the ERROR — the process that knew what
 * went wrong is gone, and the bundle that threw is no longer running. The update
 * log records only that a launch failed (`failureCount = 1`), never why. Twice
 * now that has left us reasoning backwards from a state machine and guessing at
 * causes, which is a slow way to be wrong.
 *
 * So the crashing bundle writes its own last words down before it dies, and the
 * surviving bundle reads them back. The file lives in the app's document
 * directory, which belongs to the INSTALL and not to any one update, so it
 * outlives the rollback that destroys everything else about the failed launch.
 *
 * The write is SYNCHRONOUS on purpose. A global JS error handler is running on
 * borrowed time — once it returns, the runtime is torn down — and an awaited
 * write would still be queued when the process goes away. Synchronous is the
 * whole point; do not "modernise" this into an async write.
 */
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';

const CRASH_FILE = 'startup-crash.json';

export interface StartupCrash {
	/** When it died (ms). The reader shows this so a stale record is obvious. */
	at: number;
	/** The update that threw — the whole point, since the app is now on another one. */
	updateId: string;
	/** True if the bundle that died came over the air rather than being embedded. */
	fromUpdate: boolean;
	/** Whether RN considered this fatal (a non-fatal one still tells us plenty). */
	fatal: boolean;
	message: string;
	stack: string;
}

function crashFile(): File {
	return new File(Paths.document, CRASH_FILE);
}

/**
 * Puts the record on disk before the process is torn down.
 *
 * `FileHandle` is used rather than `File.write()` because its contract is
 * explicitly synchronous — `open()`, `writeBytes()`, `close()` all return
 * immediately. That is the property the whole recorder depends on: a global
 * error handler runs on borrowed time, and anything that merely SCHEDULES a
 * write loses the race with the dying runtime. `write()` is kept as a fallback
 * for the case where TextEncoder is somehow not installed yet, which is possible
 * this early in startup — a record written by the slower path still beats none.
 */
function writeSync(json: string): void {
	const file = crashFile();
	file.create({ overwrite: true });

	try {
		const handle = file.open();
		try {
			handle.writeBytes(new TextEncoder().encode(json));
		} finally {
			handle.close();
		}
	} catch {
		file.write(json);
	}
}

/**
 * Records the crash and hands the error on to whoever was handling it before.
 *
 * Passing it along matters: expo-updates' own recovery is downstream of this
 * handler, and swallowing the error would leave the app wedged in the broken
 * bundle instead of rolling back. This observes, it does not intervene.
 */
export function installCrashRecorder(): void {
	const previous = ErrorUtils.getGlobalHandler();

	ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
		try {
			const record: StartupCrash = {
				at: Date.now(),
				updateId: Updates.updateId ?? '(embedded)',
				fromUpdate: !Updates.isEmbeddedLaunch,
				fatal: isFatal ?? false,
				message: String(error?.message ?? error),
				stack: String(error?.stack ?? '').slice(0, 4000),
			};
			writeSync(JSON.stringify(record));
		} catch {
			// A recorder that throws inside the crash handler would mask the very
			// error it exists to capture. Losing the record is the lesser failure.
		}

		previous(error, isFatal);
	});
}

/**
 * The last recorded startup crash, or null if the app has never died on launch.
 *
 * Async, unlike the write: this runs in a healthy app that has all the time it
 * needs. Only the writer is racing a teardown.
 */
export async function readStartupCrash(): Promise<StartupCrash | null> {
	try {
		const file = crashFile();
		if (!file.exists) {
			return null;
		}
		return JSON.parse(await file.text()) as StartupCrash;
	} catch {
		return null;
	}
}

/** Forget the recorded crash, once it has been read and acted on. */
export function clearStartupCrash(): void {
	try {
		const file = crashFile();
		if (file.exists) {
			file.delete();
		}
	} catch {
		// Nothing to do; a stale record is harmless next to a crash on cleanup.
	}
}
