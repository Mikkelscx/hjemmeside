/**
 * LÅST: iPad/tablet portræt mindmap på projects.html (godkendt 20260525).
 * Ændr KUN denne fil når brugeren eksplicit beder om tablet-portræt justeringer.
 * Mobil-portræt, landscape og desktop må tunes i script.js/styles.css uden at røre her.
 */
(function (global) {
	'use strict';

	global.MSK_PROJECTS_IPAD_PORTRAIT_LOCK = {
		version: '20260525-lock4-approved',
		frozen: true,

		grid: {
			liftY: 24,
			rowSpanMul: 0.88,
			kobajerNodeExtraY: 16,
		},

		paperLinesLiftY: -22,

		rings: {
			repop: {
				src: 'assets/circle around repop by depop.webp',
				cls: 'repop-image',
				w: 380 * 0.96 * 1.92,
				h: 165 * 0.96 * 1.8,
				rotate: 180,
			},
			naturli: {
				src: "assets/cirkel omkring naturli'.webp",
				cls: 'naturli-image',
				w: 240 * 1.82 * 1.14,
				h: 140 * 1.52,
				dx: 10,
				dy: -12,
				rotate: 180,
			},
			durex: {
				src: 'assets/circle omkring durex x guess who.webp',
				cls: 'durex-image',
				w: 440 * 0.98 * 0.805 * 1.66,
				h: 150 * 0.98 * 0.805 * 1.84,
				dy: 8,
			},
			ungeModUv: {
				src: 'assets/unge mod uv cirkel.webp',
				cls: 'unge-mod-uv-image',
				w: 320 * 0.94 * 1.82,
				h: 150 * 0.94 * 1.52,
			},
			twister: {
				src: 'assets/cirkel omkring twister.webp',
				cls: 'twister-image',
				w: 280 * 0.88 * 2.24,
				h: 170 * 0.88 * 0.74 * 1.84,
				dy: 12,
			},
			kobajer: {
				src: 'assets/cirkel købajer.webp',
				cls: 'kobajer-image',
				wBase: 232 * 0.78 * 2.02,
				hBase: 232 * 0.78 * 0.74 * 1.48 * 1.76,
				rightWMul: 1.1,
				dxBase: -18,
				dxNudge: 14,
				dy: -64,
				rotate: 180,
			},
			brainfarts: {
				src: 'assets/cirkel om brainfarts.webp',
				cls: 'brainfarts-image',
				w: 240 * 0.78 * 3.02,
				h: 200 * 0.78 * 1.8,
			},
			byens: {
				src: 'assets/circle omkring byens landhandel.webp',
				cls: 'byens-image',
				w: 440 * 0.78 * 2.55,
				h: 170 * 0.78 * 0.94 * 1.5,
				dy: -14,
			},
		},

		lines: {
			repDurex: {
				portraitLineDy: 10,
				lineH: 252,
				extraDy: 7,
				gapA: 34,
				gapB: 2,
				lenMul: 1.04 * 0.88,
			},
			durexBrain: {
				brainIpadDy: 24,
				brainExtraDy: 26,
				gapB: -10,
				lenMul: 0.88 * 1.16,
				lineH: 318,
			},
			twBrain: {
				angleOffset: -10,
				gapB: -30,
				lenMul: 1.22,
				lineH: 278,
			},
			twBrainfarts: {
				shiftUp: 48,
				liftExtra: 12,
				bfDownExtra: 10,
				lineH: 322,
				gapA: 8,
				gapB: 2,
				lenMul: 1.34,
			},
			natUng: {
				liftY: 14,
				aLift: 26,
				bDrop: 26,
				gapA: 2,
				gapB: 4,
				lenMul: 0.88 * 1.32,
				lineH: 198,
			},
			ungeBrain: {
				bExtraDy: 16,
				gapB: -6,
				lenMul: 0.88 * 1.12,
				lineH: 268,
			},
			kobBye: {
				topInsetX: 84,
				lenMul: 2.24,
				startNudgeX: -24,
				shiftUp: 44,
				lineH: 268,
				gapA: -8,
				gapB: 14,
				ipadLift: 10,
				bfExtraUp: 10,
				portraitDown: 14,
				alignX: 52,
			},
		},
	};
})(typeof window !== 'undefined' ? window : globalThis);
