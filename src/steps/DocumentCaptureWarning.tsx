"use client";

import { TriangleAlert, ImageUp, RotateCcw } from '../components/icons';
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { useText } from "../i18n";
import {
	canContinueAnyway,
	captureProblemMessages,
	captureProblemSides,
	captureRetakeLabel,
	type CaptureProblem,
	type CaptureSide,
} from "../lib/document-capture-check";

// The review footer when the capture check found a photo the verification could
// not read. Retaking is the primary action; a face or barcode detector can
// miss, so continuing with the photos as they are stays one tap away. A cut-off
// document offers no way past: the verification would fail it.

export function DocumentCaptureWarning({
	problems,
	uploadOnly,
	isBusy,
	onRetake,
	onContinueAnyway,
}: {
	problems: CaptureProblem[];
	/** Photos picked from the device are replaced, not retaken. */
	uploadOnly: boolean;
	isBusy: boolean;
	onRetake: (side: CaptureSide) => void;
	onContinueAnyway: () => void;
}) {
	const t = useText();
	const sides = captureProblemSides(problems);
	const RetakeIcon = uploadOnly ? ImageUp : RotateCcw;

	return (
		<div className='space-y-3 motion-safe:animate-slide-up'>
			<Alert className='border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-50 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300'>
				<TriangleAlert className='h-4 w-4' aria-hidden />
				<AlertTitle>{t("uploadDocument.check.title")}</AlertTitle>
				<AlertDescription>
					<ul className='space-y-1'>
						{captureProblemMessages(problems, t).map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				</AlertDescription>
			</Alert>

			<div className={cn("grid gap-2", sides.length > 1 && "grid-cols-2")}>
				{sides.map((side, index) => (
					<Button
						key={side}
						variant={index === 0 ? "default" : "outline"}
						className='w-full gap-2'
						onClick={() => onRetake(side)}
						disabled={isBusy}>
						<RetakeIcon className='h-4 w-4' aria-hidden />
						{captureRetakeLabel(side, uploadOnly, t)}
					</Button>
				))}
			</div>

			{canContinueAnyway(problems) && (
				<Button
					variant='outline'
					className='w-full'
					onClick={onContinueAnyway}
					disabled={isBusy}>
					{t("common.continueAnyway")}
				</Button>
			)}
		</div>
	);
}
