"use client";

import { SubmittingScreen } from "./SubmittedScreens";
import { useText } from "../i18n";

/**
 * What the step shows while a scan moves straight on, with the review screen
 * switched off: the photo is uploading and being checked, and there is nothing
 * to do. A problem brings the review back.
 */
export function DocumentHandover({ retryInfo }: { retryInfo: { attempt: number; total: number } | null }) {
	const t = useText();
	return (
		<SubmittingScreen
			title={t("uploadDocument.handover.title")}
			description={
				retryInfo ?
					t("uploadDocument.review.retrying", { attempt: retryInfo.attempt, total: retryInfo.total })
				:	t("uploadDocument.handover.description")
			}
		/>
	);
}
