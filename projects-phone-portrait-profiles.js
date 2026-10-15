/**
 * Telefon portraet: kontinuerlig skalering for alle mobilsk�rme.
 * Reference: iPhone 12 Pro (390 x 844) = faktor 1.0.
 *
 * Daetekker typisk portraet-viewports ca. 240�640 px bredde og 400�1100 px hoejde
 * (iPhone SE, Galaxy, Pixel, Pro Max, foldables, smaa Android osv.) uden faste buckets.
 */
(function (global) {
	'use strict';

	const MSK_PHONE_PORTRAIT_REF = { w: 390, h: 844 };

	/** Absolutte graenser for mobil portraet (px) */
	const MSK_PHONE_LAYOUT = {
		wMin: 240,
		wMax: 640,
		hMin: 400,
		hMax: 1100,
	};

	const MSK_PHONE_REF_BASE_SCALE = (MSK_PHONE_PORTRAIT_REF.w / 1024) * 0.98;
	const MSK_PHONE_REF_LABEL_MUL = MSK_PHONE_REF_BASE_SCALE;
	const MSK_PHONE_REF_BRAIN_PX = (318 * MSK_PHONE_PORTRAIT_REF.w) / 1024;
	const MSK_PHONE_REF_ASPECT = MSK_PHONE_PORTRAIT_REF.w / MSK_PHONE_PORTRAIT_REF.h;

	function mskClamp(n, lo, hi) {
		return Math.max(lo, Math.min(hi, n));
	}

	function mskLerp(a, b, t) {
		return a + (b - a) * t;
	}

	/** Bedste layout-maal: inner*, visualViewport, screen (i raekkefoelge). */
	function mskPhonePortraitLayoutPx(w, h) {
		let iw = w != null ? w : global.innerWidth;
		let ih = h != null ? h : global.innerHeight;
		try {
			const vv = global.visualViewport;
			if (vv && vv.width >= 200 && vv.height >= 300) {
				iw = vv.width;
				ih = vv.height;
			}
		} catch (_) {}
		try {
			if ((!iw || iw < 200) && global.screen && global.screen.width) {
				const sw = global.screen.width;
				const sh = global.screen.height;
				iw = Math.min(sw, sh);
				ih = Math.max(sw, sh);
			}
		} catch (_) {}
		iw = Math.round(mskClamp(iw || MSK_PHONE_PORTRAIT_REF.w, MSK_PHONE_LAYOUT.wMin, MSK_PHONE_LAYOUT.wMax));
		ih = Math.round(mskClamp(ih || MSK_PHONE_PORTRAIT_REF.h, MSK_PHONE_LAYOUT.hMin, MSK_PHONE_LAYOUT.hMax));
		return { w: iw, h: ih };
	}

	function mskComputePhonePortraitProfileFactors(w, h) {
		const refW = MSK_PHONE_PORTRAIT_REF.w;
		const refH = MSK_PHONE_PORTRAIT_REF.h;
		const px = mskPhonePortraitLayoutPx(w, h);
		const iw = px.w;
		const ih = px.h;

		const rawWRatio = iw / refW;
		const rawHRatio = ih / refH;
		const aspect = iw / ih;
		const aspectDelta = aspect / MSK_PHONE_REF_ASPECT;

		/* Bred/hoej relativt reference � ingen sn�ver bucket, kun bl�d clamp i ekstremer */
		const wRatio = mskClamp(rawWRatio, MSK_PHONE_LAYOUT.wMin / refW, MSK_PHONE_LAYOUT.wMax / refW);
		const hRatio = mskClamp(rawHRatio, MSK_PHONE_LAYOUT.hMin / refH, MSK_PHONE_LAYOUT.hMax / refH);

		/*
		 * Samlet layout-fit: vejer bredde og hoejde (typisk telefon har mange hoejder ved samme bredde).
		 * Ved 390x844 = 1.0.
		 */
		const fitRatio = mskClamp(wRatio * 0.52 + hRatio * 0.48, 0.48, 1.62);

		const portraitScale = mskClamp(
			MSK_PHONE_REF_BASE_SCALE * fitRatio,
			MSK_PHONE_REF_BASE_SCALE * 0.48,
			MSK_PHONE_REF_BASE_SCALE * 1.62
		);

		/* Reference 390×844 → alle adj ≈ 1.0; mindre/større telefoner skalerer blødt omkring det */
		const labelMul = mskClamp(MSK_PHONE_REF_LABEL_MUL * wRatio, 0.16, 0.58);
		const brainPx = mskClamp(MSK_PHONE_REF_BRAIN_PX * fitRatio, 68, 178);

		const rowSpanAdj = mskClamp(1 + (hRatio - 1) * 0.28, 0.72, 1.1);
		const ringAdj = mskClamp(1 + (wRatio - 1) * 0.18, 0.78, 1.12);
		const rowVertMul = mskClamp(1 + (hRatio - 1) * 0.3, 0.7, 1.1);
		const safeMarginAdj = mskClamp(1 + (hRatio - 1) * 0.2, 0.72, 1.08);
		const lineAdj = mskClamp(1 + (fitRatio - 1) * 0.22, 0.78, 1.16);
		const colInsetAdj = mskClamp(1 + (wRatio - 1) * 0.12, 0.78, 1.08);
		const nodeMaxVw = mskClamp(38 + (wRatio - 1) * 14, 28, 48);
		const nudgeMul = mskClamp(1 + (wRatio - 1) * 0.2, 0.75, 1.14);

		/* Meget smalle/hoeje eller brede/lave sk�rme: ekstra lodret komprimering */
		const aspectCompress =
			aspectDelta < 0.92
				? mskClamp(0.88 + 0.12 * aspectDelta, 0.8, 1)
				: aspectDelta > 1.08
					? mskClamp(1.04 - (aspectDelta - 1.08) * 0.2, 0.92, 1.04)
					: 1;

		const rowSpanFinal = mskClamp(rowSpanAdj * aspectCompress, 0.5, 1.08);
		const rowVertFinal = mskClamp(rowVertMul * aspectCompress, 0.48, 1.08);

		/*
		 * Fit iPad-lock ringe ind i viewport: kolonner ~26%/74%, ≥10px margin.
		 * Største lock-ring × portraitScale × ringAdj × phone-extra (script.js) må ikke klippe.
		 * Phone-extra matcher mskAppendPortraitRingFromIpadLockSpec (efter ringFitMul).
		 */
		const PHONE_RING_W_EXTRA = {
			byens: 0.91,
			repop: 0.9,
			durex: 1.36 * 0.84,
			ungeModUv: 1.16 * 0.92,
			naturli: 1.14,
			twister: 1.16,
			kobajer: 1.12,
			brainfarts: 1,
		};
		let ringFitMul = 1;
		let hadLock = false;
		try {
			const lock =
				(global.MSK_PROJECTS_IPAD_PORTRAIT_LOCK && global.MSK_PROJECTS_IPAD_PORTRAIT_LOCK.rings) ||
				null;
			let maxEffW = 0;
			if (lock) {
				hadLock = true;
				Object.keys(lock).forEach((k) => {
					const spec = lock[k];
					if (!spec) return;
					let rw = Number(spec.w || spec.wBase || 0) || 0;
					if (spec.rightWMul) rw *= Number(spec.rightWMul) || 1;
					const extra = PHONE_RING_W_EXTRA[k] != null ? PHONE_RING_W_EXTRA[k] : 1;
					const eff = rw * extra;
					if (eff > maxEffW) maxEffW = eff;
				});
			}
			const scaledW = maxEffW * portraitScale * ringAdj;
			const inset = Math.max(10, Math.round(iw * 0.028));
			const colLeft = iw * 0.26;
			const colRight = iw * 0.74;
			const allowHalf = Math.min(colLeft - inset, iw - inset - colRight);
			if (scaledW > 0 && allowHalf > 24) {
				const needHalf = scaledW * 0.5;
				if (needHalf > allowHalf) {
					ringFitMul = mskClamp(allowHalf / needHalf, 0.38, 1);
				}
			}
		} catch (_) {
			ringFitMul = 1;
		}

		return {
			refW,
			refH,
			w: iw,
			h: ih,
			aspect,
			aspectDelta,
			rawWRatio,
			rawHRatio,
			wRatio,
			hRatio,
			fitRatio,
			portraitScale,
			refBaseScale: MSK_PHONE_REF_BASE_SCALE,
			labelMul,
			brainPx,
			rowSpanAdj: rowSpanFinal,
			scaleAdj: fitRatio,
			ringAdj,
			ringFitMul,
			hadLock,
			rowVertMul: rowVertFinal,
			safeMarginAdj,
			lineAdj,
			colInsetAdj,
			nodeMaxVw,
			nudgeMul,
			aspectCompress,
		};
	}

	let _cachedFactors = null;

	function mskPhonePortraitLockReady() {
		try {
			return !!(
				global.MSK_PROJECTS_IPAD_PORTRAIT_LOCK && global.MSK_PROJECTS_IPAD_PORTRAIT_LOCK.rings
			);
		} catch (_) {
			return false;
		}
	}

	function mskInvalidatePhonePortraitProfileCache() {
		_cachedFactors = null;
	}

	function mskGetPhonePortraitProfileFactors(w, h) {
		try {
			const px = mskPhonePortraitLayoutPx(w, h);
			const lockNow = mskPhonePortraitLockReady();
			/* Genberegn når iPad-lock først bliver klar (ellers ringFitMul=1 fra tidlig boot) */
			if (
				_cachedFactors &&
				_cachedFactors.w === px.w &&
				_cachedFactors.h === px.h &&
				!(!_cachedFactors.hadLock && lockNow)
			) {
				return _cachedFactors;
			}
		} catch (_) {}
		_cachedFactors = mskComputePhonePortraitProfileFactors(w, h);
		return _cachedFactors;
	}

	function mskApplyPhonePortraitCssVars(html, f) {
		html.style.setProperty('--phone-ref-w', String(f.refW));
		html.style.setProperty('--phone-ref-h', String(f.refH));
		html.style.setProperty('--phone-w-ratio', String(f.wRatio));
		html.style.setProperty('--phone-h-ratio', String(f.hRatio));
		html.style.setProperty('--phone-fit-ratio', String(f.fitRatio));
		html.style.setProperty('--phone-aspect-delta', String(f.aspectDelta));
		html.style.setProperty('--phone-portrait-scale', String(f.portraitScale));
		html.style.setProperty('--pLabelMul', String(f.labelMul));
		html.style.setProperty('--pNodeMul', String(f.labelMul));
		html.style.setProperty('--pTitleInRing', String(f.labelMul * 1.58));
		html.style.setProperty('--pRepopFill', String(f.labelMul * 1.58 * 1.32));
		html.style.setProperty('--pRingMul', String(f.ringAdj));
		html.style.setProperty('--projectsBrainSize', f.brainPx + 'px');
		html.style.setProperty('--phone-row-span-adj', String(f.rowSpanAdj));
		html.style.setProperty('--phone-scale-adj', String(f.scaleAdj));
		html.style.setProperty('--phone-ring-adj', String(f.ringAdj));
		html.style.setProperty('--phone-ring-fit', String(f.ringFitMul != null ? f.ringFitMul : 1));
		html.style.setProperty('--phone-row-vert-mul', String(f.rowVertMul));
		html.style.setProperty('--phone-safe-margin-adj', String(f.safeMarginAdj));
		html.style.setProperty('--phone-line-adj', String(f.lineAdj));
		html.style.setProperty('--phone-col-inset-adj', String(f.colInsetAdj));
		html.style.setProperty('--phone-node-max-vw', String(f.nodeMaxVw));
		html.style.setProperty('--phone-nudge-mul', String(f.nudgeMul));
		/* Labels i ring: samme relative scale som tablet (pLabelMul), ikke ekstra TitleInRing-boost */
		html.style.setProperty('--pTitleInRing', String(f.labelMul));
		html.style.setProperty('--pRepopFill', String(f.labelMul));
		html.dataset.phoneW = String(f.w);
		html.dataset.phoneH = String(f.h);
		html.dataset.phoneWRatio = String(Math.round(f.wRatio * 1000) / 1000);
		html.dataset.phoneHRatio = String(Math.round(f.hRatio * 1000) / 1000);
	}

	function mskInitPhonePortraitProfileListeners() {
		if (global.__mskPhonePortraitProfileListeners) return;
		global.__mskPhonePortraitProfileListeners = true;
		const refresh = function () {
			try {
				if (
					!global.document ||
					!global.document.documentElement.classList.contains('msk-projects-phone-portrait')
				) {
					return;
				}
				_cachedFactors = null;
				mskApplyPhonePortraitProfileDocument();
			} catch (_) {}
		};
		global.addEventListener('resize', refresh, { passive: true });
		global.addEventListener('orientationchange', refresh, { passive: true });
		try {
			if (global.visualViewport) {
				global.visualViewport.addEventListener('resize', refresh, { passive: true });
			}
		} catch (_) {}
	}

	function mskApplyPhonePortraitProfileDocument(w, h) {
		const html = global.document && global.document.documentElement;
		const f = mskGetPhonePortraitProfileFactors(w, h);
		if (!html) return f;
		try {
			mskApplyPhonePortraitCssVars(html, f);
			mskInitPhonePortraitProfileListeners();
		} catch (_) {}
		return f;
	}

	function mskBootPhonePortraitProfileVars(iw, ih) {
		try {
			mskApplyPhonePortraitProfileDocument(iw, ih);
		} catch (_) {}
	}

	/**
	 * Konverter px tunet ved reference (390x844) til aktuel telefon.
	 * Brug ved alle nye phone-portrait nudges i JS � saa propagerer aendringer til alle enheder.
	 * axis: 'w' | 'h' | 'fit' (default 'fit' = bredde+hoejde)
	 */
	function mskPhoneRefPx(px, axis, w, h) {
		const f = mskGetPhonePortraitProfileFactors(w, h);
		const n = Number(px) || 0;
		if (axis === 'w') return Math.round(n * f.wRatio);
		if (axis === 'h') return Math.round(n * f.hRatio);
		return Math.round(n * f.fitRatio);
	}

	global.MSK_PHONE_PORTRAIT_REF = MSK_PHONE_PORTRAIT_REF;
	global.MSK_PHONE_LAYOUT = MSK_PHONE_LAYOUT;
	global.MSK_PHONE_REF_BASE_SCALE = MSK_PHONE_REF_BASE_SCALE;
	global.mskPhonePortraitLayoutPx = mskPhonePortraitLayoutPx;
	global.mskComputePhonePortraitProfileFactors = mskComputePhonePortraitProfileFactors;
	global.mskGetPhonePortraitProfileFactors = mskGetPhonePortraitProfileFactors;
	global.mskInvalidatePhonePortraitProfileCache = mskInvalidatePhonePortraitProfileCache;
	global.mskApplyPhonePortraitProfileDocument = mskApplyPhonePortraitProfileDocument;
	global.mskBootPhonePortraitProfileVars = mskBootPhonePortraitProfileVars;
	global.mskPhoneRefPx = mskPhoneRefPx;
})(typeof window !== 'undefined' ? window : globalThis);
