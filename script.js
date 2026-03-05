// Simple JavaScript for any interactive functionality
document.addEventListener('DOMContentLoaded', function() {
	// If a page is loaded inside a transition iframe, render "clean" (no navbar),
	// but keep the page's OWN paper design so it matches exactly.
	(function applyTransitionPreviewMode() {
		try {
			const params = new URLSearchParams(window.location.search || '');
			if (!params.has('preview')) return;
			document.documentElement.classList.add('transition-preview');
		} catch {
			// ignore
		}
	})();

	// Add smooth scrolling for anchor links
	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (e) {
			e.preventDefault();
			const target = document.querySelector(this.getAttribute('href'));
			if (target) {
				target.scrollIntoView({
					behavior: 'smooth'
				});
			}
		});
	});











	// Initialize lazy YouTube players
	(function initLazyVideos() {
		const lazyContainers = document.querySelectorAll('.video-lazy');
		lazyContainers.forEach((container) => {
			container.addEventListener('click', function () {
				const videoId = container.getAttribute('data-video-id');
				if (!videoId) return;
				const iframe = document.createElement('iframe');
				iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
				iframe.title = 'Twister Video';
				iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
				iframe.allowFullscreen = true;
				iframe.referrerPolicy = 'strict-origin-when-cross-origin';
				iframe.style.position = 'absolute';
				iframe.style.inset = '0';
				iframe.style.width = '100%';
				iframe.style.height = '100%';
				iframe.style.border = '0';
				container.innerHTML = '';
				container.appendChild(iframe);
			});
		});
	})();



	// Desktop-only corner fold hover hint (shows on the page corner itself).
	(function initCornerFoldHoverHints() {
		try {
			if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		} catch { return; }
		try {
			if (document.querySelector('.corner-fold-hints')) return;
			const layer = document.createElement('div');
			layer.className = 'corner-fold-hints';
			layer.setAttribute('aria-hidden', 'true');
			layer.innerHTML = `
				<div class="corner-fold-hint corner-fold-hint--left" aria-hidden="true"></div>
				<div class="corner-fold-hint corner-fold-hint--right" aria-hidden="true"></div>
			`;
			document.body.appendChild(layer);
		} catch {}

		// Event delegation so it works for both global handles and page-specific handles.
		document.addEventListener('pointerover', (e) => {
			const t = e && e.target && e.target.closest ? e.target.closest('.page-turn-handle') : null;
			if (!t) return;
			if (t.classList.contains('page-turn-handle--right')) document.body.classList.add('corner-fold-right');
			if (t.classList.contains('page-turn-handle--left')) document.body.classList.add('corner-fold-left');
		}, true);
		document.addEventListener('pointerout', (e) => {
			const t = e && e.target && e.target.closest ? e.target.closest('.page-turn-handle') : null;
			if (!t) return;
			const rel = e && e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.page-turn-handle') : null;
			// Only remove if we're leaving the handle entirely.
			if (t.classList.contains('page-turn-handle--right') && !(rel && rel.classList.contains('page-turn-handle--right'))) {
				document.body.classList.remove('corner-fold-right');
			}
			if (t.classList.contains('page-turn-handle--left') && !(rel && rel.classList.contains('page-turn-handle--left'))) {
				document.body.classList.remove('corner-fold-left');
			}
		}, true);
	})();

	console.log('Portfolio website loaded successfully!');

	function getPageFlipMs(fallbackMs) {
		try {
			const root = document.documentElement;
			if (!root || !window.getComputedStyle) return fallbackMs;
			const raw = window.getComputedStyle(root).getPropertyValue('--pageFlipMs').trim();
			if (!raw) return fallbackMs;
			const m = raw.match(/^([0-9]*\\.?[0-9]+)\\s*(ms|s)?$/i);
			if (!m) return fallbackMs;
			const n = Number(m[1]);
			if (!Number.isFinite(n)) return fallbackMs;
			const unit = (m[2] || 'ms').toLowerCase();
			return unit === 's' ? Math.round(n * 1000) : Math.round(n);
		} catch {
			return fallbackMs;
		}
	}

	function getCssVarMsFromEl(el, varName, fallbackMs) {
		try {
			if (!el || !window.getComputedStyle) return fallbackMs;
			const raw = window.getComputedStyle(el).getPropertyValue(varName).trim();
			if (!raw) return fallbackMs;
			const m = raw.match(/^([0-9]*\\.?[0-9]+)\\s*(ms|s)?$/i);
			if (!m) return fallbackMs;
			const n = Number(m[1]);
			if (!Number.isFinite(n)) return fallbackMs;
			const unit = (m[2] || 'ms').toLowerCase();
			return unit === 's' ? Math.round(n * 1000) : Math.round(n);
		} catch {
			return fallbackMs;
		}
	}

	function getPageFlipEase(fallbackEase) {
		try {
			const root = document.documentElement;
			if (!root || !window.getComputedStyle) return fallbackEase;
			const raw = window.getComputedStyle(root).getPropertyValue('--pageFlipEase').trim();
			return raw || fallbackEase;
		} catch {
			return fallbackEase;
		}
	}

	function angleDegFromMatrix3d(transformStr) {
		try {
			const s = String(transformStr || '').trim();
			if (!s || s === 'none') return null;
			if (!s.startsWith('matrix3d(') || !s.endsWith(')')) return null;
			const nums = s.slice(9, -1).split(',').map((v) => Number(String(v).trim()));
			if (nums.length !== 16 || nums.some((n) => !Number.isFinite(n))) return null;
			// CSS matrix3d is column-major. For rotateY(θ): m11 = cosθ, m31 = sinθ.
			const m11 = nums[0];
			const m31 = nums[8];
			const rad = Math.atan2(m31, m11);
			return (rad * 180) / Math.PI;
		} catch {
			return null;
		}
	}

	function navigateAfterFlip({ element, fallbackMs, href }) {
		let done = false;
		function finish() {
			if (done) return;
			done = true;
			try { window.location.href = href; } catch {}
		}
		try {
			if (element && element.addEventListener) {
				element.addEventListener('animationend', finish, { once: true });
				element.addEventListener('animationcancel', finish, { once: true });
			}
		} catch {}
		window.setTimeout(finish, Math.max(0, Number(fallbackMs) || 0));
	}

	// Projekter -> Om mig: RIGHT page turns to the LEFT (full 180°, no snaps).
	(function initProjectsToAboutFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/projects.html') && !path.endsWith('projects.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(5200); // matches CSS `--pageFlipMs`
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.projects-about-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'projects-about-transition';
				overlay.innerHTML = `
					<div class="projects-about-turn" aria-hidden="true">
						<div class="projects-about-under projects-about-under--left">
							<iframe class="projects-about-frame projects-about-frame--left projects-about-under-frame projects-about-under-frame--projects" src="projects.html?preview=1" title="Projekter (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="projects-about-under projects-about-under--right">
							<iframe class="projects-about-frame projects-about-frame--right projects-about-under-frame projects-about-under-frame--projects" src="projects.html?preview=1" title="Projekter (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="projects-about-frame projects-about-frame--right projects-about-under-frame projects-about-under-frame--about" src="about.html?preview=1" title="Om mig (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="projects-about-turn__flip">
							<div class="projects-about-turn__flip-face projects-about-turn__flip-face--front">
								<iframe class="projects-about-frame projects-about-frame--right projects-about-turn__flip-front" src="projects.html?preview=1" title="Projekter (right turning sheet)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="projects-about-turn__flip-face projects-about-turn__flip-face--back">
								<iframe class="projects-about-frame projects-about-frame--left projects-about-turn__flip-back" src="about.html?preview=1" title="Om mig (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		// NOTE: we avoid cross-document style injection for previews (file:// can block it).
		// Instead, the iframe URLs include `?preview=1` and the page styles hide nav themselves.

		function prepOneFrame(fr) {
			try {
				if (!fr || !fr.contentDocument) return false;
				const doc = fr.contentDocument;
				// Make the preview pages hide nav/edge UI etc.
				// (CSS keys off `html.transition-preview`.)
				doc.documentElement.classList.add('transition-preview');
				// Back-compat with older selectors that might exist in some pages.
				doc.documentElement.classList.add('home-preview');
				doc.documentElement.classList.add('home-preview-reveal');
				fr.dataset.homePreviewReady = '1';
				return true;
			} catch {
				return false;
			}
		}

		function wireFramesOnce(overlay) {
			if (!overlay || overlay.dataset.framesWired === '1') return;
			overlay.dataset.framesWired = '1';
			const frames = Array.from(overlay.querySelectorAll('iframe'));
			frames.forEach((fr) => {
				// Mark loaded without relying on contentDocument access (file:// safe)
				try {
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
				} catch {}
				// If already loaded from cache, `load` may not fire again.
				try {
					const d = fr.contentDocument;
					if (d && (d.readyState === 'complete' || d.readyState === 'interactive')) {
						fr.classList.add('is-loaded');
					}
				} catch {}
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});
		}

		function watchSeamSwap(overlay) {
			let done = false;
			const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
			const fallbackMs = Math.round(FLIP_MS * 0.5);

			function angleDegFromMatrix3d(transformStr) {
				try {
					const s = String(transformStr || '').trim();
					if (!s || s === 'none') return null;
					if (!s.startsWith('matrix3d(') || !s.endsWith(')')) return null;
					const nums = s.slice(9, -1).split(',').map((v) => Number(String(v).trim()));
					if (nums.length !== 16 || nums.some((n) => !Number.isFinite(n))) return null;
					const m11 = nums[0];
					const m31 = nums[8];
					const rad = Math.atan2(m31, m11);
					return (rad * 180) / Math.PI;
				} catch {
					return null;
				}
			}

			function tick() {
				if (done) return;
				if (!overlay || !overlay.classList || !overlay.classList.contains('is-turning')) return;
				try {
					const flipEl = overlay.querySelector('.projects-about-turn__flip');
					if (flipEl && window.getComputedStyle) {
						const tf = window.getComputedStyle(flipEl).transform;
						const ang = angleDegFromMatrix3d(tf);
						// Right page flips LEFT: 0 -> -180. Seam is -90deg.
						if (typeof ang === 'number' && ang <= -90) {
							overlay.classList.add('swap-flip-mid');
							done = true;
							return;
						}
					}
				} catch {}

				const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
				if ((now - startAt) >= fallbackMs) {
					try { overlay.classList.add('swap-flip-mid'); } catch {}
					done = true;
					return;
				}
				requestAnimationFrame(tick);
			}
			requestAnimationFrame(tick);
		}

		// Prewarm the overlay and iframes so "Om mig (left)" is already loaded
		// when the user clicks (prevents blank page at the seam).
		try {
			const pre = ensureOverlay();
			wireFramesOnce(pre);
		} catch {}

		function startFlipToAbout(targetHref) {
			const body = document.body;
			// Prevent double-starting while an existing flip is running.
			if (body.classList.contains('projects-about-flip-active')) return;

			body.classList.add('projects-about-flip-active');
			body.style.overflow = 'hidden';

			const overlay = ensureOverlay();
			wireFramesOnce(overlay);
			try { overlay.classList.remove('is-ready', 'is-turning', 'swap-under-right', 'swap-flip-mid'); } catch {}

			// Show overlay first (avoid a 1-frame blink), then start the flip.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					try { overlay.classList.add('is-ready'); } catch {}
					requestAnimationFrame(() => {
						try { overlay.classList.add('is-turning'); } catch {}
						// Right under-page can switch immediately (it is covered by turning sheet early).
						try { overlay.classList.add('swap-under-right'); } catch {}
						// Seam: swap the FLIPPING page content exactly at 90deg.
						watchSeamSwap(overlay);
						// Safety fallback (in case transform can't be read).
						window.setTimeout(() => {
							try { overlay.classList.add('swap-flip-mid'); } catch {}
						}, Math.round(FLIP_MS * 0.5));
					});
				});
			});

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.projects-about-turn__flip') : null;
			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			const hrefLower = hrefAttr.toLowerCase();
			if (!(hrefLower === 'about.html' || hrefLower.startsWith('about.html#') || hrefLower.startsWith('about.html?'))) return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			try { e.stopImmediatePropagation(); } catch {}
			startFlipToAbout(a.href);
		}, true);

		// Drag-to-turn from Projekter -> Om mig (corner pull).
		(function initProjectsToAboutDrag() {
			const DRAG_CLASS = 'projects-about-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round(window.innerWidth * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }

			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--right';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, flipEl, overlay) {
				progress = clamp01(p);
				const angle = -180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						if (progress > 0.02) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');
						if (progress >= 0.5) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');
					}
				} catch {}
			}

			function cleanupDragState(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'projects-about-flip-active'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
				// Remove overlay if we cancelled.
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('projects-about-flip-active', DRAG_CLASS);
				body.style.overflow = 'hidden';

				// Always rebuild overlay (prevents stale markup).
				try {
					const old = document.querySelector('.projects-about-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				try { overlay.classList.add('is-ready', 'is-turning'); } catch {}
				const flipEl = overlay.querySelector('.projects-about-turn__flip');
				// Full-screen pointer catcher so we keep receiving move events even when the pointer
				// passes over iframes (without this, drag can "stop" around the middle).
				const catcher = document.createElement('div');
				catcher.setAttribute('aria-hidden', 'true');
				catcher.style.position = 'fixed';
				catcher.style.inset = '0';
				catcher.style.zIndex = '100000';
				catcher.style.background = 'transparent';
				catcher.style.pointerEvents = 'auto';
				catcher.style.touchAction = 'none';
				try { document.body.appendChild(catcher); } catch {}
				try { catcher.setPointerCapture && catcher.setPointerCapture(e.pointerId); } catch {}

				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					try { fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true }); } catch {}
					if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
				});

				// Start from 0 progress.
				requestAnimationFrame(() => {
					setProgress(0, flipEl, overlay);
				});

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Right page to left: startX -> seam (0..0.5), then seam -> left edge (0.5..1)
					let p = 0;
					if (x >= startX) {
						p = 0;
					} else if (x >= seamX) {
						const denom = Math.max(1, (startX - seamX));
						p = ((startX - x) / denom) * 0.5;
					} else {
						p = 0.5 + ((seamX - x) / Math.max(1, seamX)) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, flipEl, overlay);
						});
					}
				}

				function onUp() {
					try { catcher.removeEventListener('pointermove', onMove, true); } catch {}
					try { catcher.removeEventListener('pointerup', onUp, true); } catch {}
					try { catcher.removeEventListener('pointercancel', onUp, true); } catch {}
					try { catcher.remove(); } catch {}

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						// Snap back
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanupDragState(overlay, flipEl), 280);
						return;
					}

					// Complete flip to end
					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							const finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(-180deg)';
						}
					} catch {}
					// Navigate after the remaining motion finishes (avoids snap after the middle).
					window.setTimeout(() => {
						try { window.location.href = 'about.html'; } catch {}
					}, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				// Bind to the catcher so moves continue over iframes.
				catcher.addEventListener('pointermove', onMove, true);
				catcher.addEventListener('pointerup', onUp, true);
				catcher.addEventListener('pointercancel', onUp, true);
			}

			// Add handle and bind pointerdown.
			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}

		})();
	})();

	// Projekter -> Kontakt: flip the RIGHT page to the LEFT side.
	(function initProjectsToContactFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/projects.html') && !path.endsWith('projects.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.projects-contact-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'projects-contact-transition';
				overlay.innerHTML = `
					<div class="projects-contact-turn" aria-hidden="true">
						<div class="projects-contact-turn__under projects-contact-turn__under--left">
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__under-frame projects-contact-turn__under-frame--projects projects-contact-turn__page--projects" src="projects.html?preview=1" title="Projekter (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__under-frame projects-contact-turn__under-frame--contact projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="projects-contact-turn__under projects-contact-turn__under--right">
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--right projects-contact-turn__under-frame projects-contact-turn__under-frame--projects projects-contact-turn__page--projects" src="projects.html?preview=1" title="Projekter (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="projects-contact-turn__frame projects-contact-turn__frame--right projects-contact-turn__under-frame projects-contact-turn__under-frame--contact projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="projects-contact-turn__flip">
							<div class="projects-contact-turn__flip-face projects-contact-turn__flip-face--front">
								<!-- Swap DESIGN on the FLIPPING page (same pattern as Kontakt -> Om mig) -->
								<iframe class="projects-contact-turn__frame projects-contact-turn__frame--right projects-contact-turn__flip-front projects-contact-turn__flip-front--projects projects-contact-turn__page--projects" src="projects.html?preview=1" title="Projekter (right on turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__flip-front projects-contact-turn__flip-front--contact projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (left on turning page after swap)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="projects-contact-turn__flip-face projects-contact-turn__flip-face--back">
								<iframe class="projects-contact-turn__frame projects-contact-turn__frame--left projects-contact-turn__flip-back projects-contact-turn__page--contact" src="contact.html?preview=1" title="Kontakt (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startFlipToContact(targetHref) {
			const body = document.body;
			if (body.classList.contains('projects-contact-flipping') || document.querySelector('.projects-contact-transition')) return;

			try {
				const old = document.querySelector('.projects-contact-transition');
				if (old) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			try {
				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					fr.classList.remove('is-loaded');
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
					// If already loaded from cache, `load` may not fire again.
					try {
						const d = fr.contentDocument;
						if (d && (d.readyState === 'complete' || d.readyState === 'interactive')) {
							fr.classList.add('is-loaded');
						}
					} catch {}
				});
			} catch {}
			overlay.classList.remove('is-ready', 'is-turning', 'swap-under-left', 'swap-under-right', 'swap-flip-mid');

			// Show overlay first (prevents 1-frame blink), then hide the real page.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					body.classList.add('projects-contact-flip-active');
					body.classList.add('projects-contact-flipping');
					body.style.overflow = 'hidden';

					requestAnimationFrame(() => overlay.classList.add('is-turning'));

					// Match the other flips: the turning sheet switches exactly at the seam (50%).
					// Before 50%: show Projekter RIGHT on the turning sheet.
					// After 50%: show Kontakt LEFT on the turning sheet, and reveal Kontakt-left underneath.
					const seamMs = Math.round(FLIP_MS * 0.5);
					window.setTimeout(() => overlay.classList.add('swap-flip-mid'), seamMs);
					window.setTimeout(() => overlay.classList.add('swap-under-left'), seamMs);

					const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.projects-contact-turn__flip') : null;
					navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
				});
			});
		}

		// Projekter -> Kontakt (MENU): double flip
		// Flip #1 reveals Om mig spread. Flip #2 reveals Kontakt spread. Then navigate.
		function ensureDoubleOverlay() {
			let overlay = document.querySelector('.projects-contact-double-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'projects-contact-double-transition';
				overlay.innerHTML = `
					<div class="pcd-turn" aria-hidden="true">
						<div class="pcd-under pcd-under--left">
							<iframe class="pcd-frame pcd-frame--left pcd-under-frame pcd-under-left--projects" src="projects.html?preview=1" title="Projekter (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--left pcd-under-frame pcd-under-left--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--left pcd-under-frame pcd-under-left--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="pcd-under pcd-under--right">
							<iframe class="pcd-frame pcd-frame--right pcd-under-frame pcd-under-right--projects" src="projects.html?preview=1" title="Projekter (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--right pcd-under-frame pcd-under-right--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="pcd-frame pcd-frame--right pcd-under-frame pcd-under-right--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="pcd-flip pcd-flip--1">
							<div class="pcd-flip-face pcd-flip-face--front">
								<iframe class="pcd-frame pcd-frame--right pcd-flip-front pcd-flip1-front--projects" src="projects.html?preview=1" title="Projekter (right turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="pcd-frame pcd-frame--left pcd-flip-front pcd-flip1-front--about" src="about.html?preview=1" title="Om mig (left turning page after mid)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="pcd-flip-face pcd-flip-face--back">
								<iframe class="pcd-frame pcd-frame--left pcd-flip-back pcd-flip1-back--about" src="about.html?preview=1" title="Om mig (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>

						<div class="pcd-flip pcd-flip--2">
							<div class="pcd-flip-face pcd-flip-face--front">
								<iframe class="pcd-frame pcd-frame--right pcd-flip-front pcd-flip2-front--about" src="about.html?preview=1" title="Om mig (right turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="pcd-frame pcd-frame--left pcd-flip-front pcd-flip2-front--contact" src="contact.html?preview=1" title="Kontakt (left turning page after mid)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="pcd-flip-face pcd-flip-face--back">
								<iframe class="pcd-frame pcd-frame--left pcd-flip-back pcd-flip2-back--contact" src="contact.html?preview=1" title="Kontakt (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startDoubleFlipToContact(targetHref) {
			const body = document.body;
			if (body.classList.contains('projects-contact-flipping')) return;
			const existing = document.querySelector('.projects-contact-double-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.projects-contact-double-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureDoubleOverlay();
			try { overlay.classList.remove('is-ready', 'stage-1', 'stage-2', 'is-turning-1', 'is-turning-2', 'swap1-mid', 'swap2-mid'); } catch {}
			try { overlay.classList.remove('is-preloading'); } catch {}

			// Match JS fallback timers to this overlay's speed.
			const DOUBLE_MS = getCssVarMsFromEl(overlay, '--pageFlipMs', FLIP_MS);

			const flip1 = overlay.querySelector('.pcd-flip--1');
			const flip2 = overlay.querySelector('.pcd-flip--2');
			// Mark iframes as loaded (helps avoid a white/blank paint at mid).
			try {
				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					try {
						// Don't clear `is-loaded` here; we rely on preloading to avoid 1-frame blanks.
						fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
						// If already in cache, `load` may not fire again.
						try {
							const d = fr.contentDocument;
							if (d && (d.readyState === 'complete' || d.readyState === 'interactive')) {
								fr.classList.add('is-loaded');
							}
						} catch {}
					} catch {}
				});
			} catch {}

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					// Stage 1 must be set before showing overlay (it controls which under pages display).
					try { overlay.classList.add('stage-1'); } catch {}

					// Show overlay immediately.
					try {
						overlay.classList.add('is-ready');
						overlay.style.transition = 'none';
						overlay.style.opacity = '1';
						void overlay.offsetHeight;
					} catch {}

					// Next frame: hide real page and start flip.
					requestAnimationFrame(() => {
						body.classList.add('projects-contact-double-active');
						body.classList.add('projects-contact-flipping');
						body.style.overflow = 'hidden';
						try { overlay.classList.add('is-turning-1'); } catch {}
						try { overlay.classList.add('swap1-under-right'); } catch {}
					});

					// Flip #1: swap at the middle seam (matches the drag feel).
					// For a right-page flipping LEFT, the seam is at rotateY(-90deg).
					(function scheduleFlip1MidSwapOnce() {
						let scheduled = false;
						function scheduleFromAnimationStart() {
							if (scheduled) return;
							scheduled = true;
							let done = false;
							const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
							const fallbackMs = Math.round(DOUBLE_MS * 0.5) + 40;
							function tick() {
								if (done) return;
								try {
									if (flip1 && window.getComputedStyle) {
										const ang = angleDegFromMatrix3d(window.getComputedStyle(flip1).transform);
										// 0 -> -180, seam at -90.
										if (typeof ang === 'number' && ang <= -90) {
											try { overlay.classList.add('swap1-mid'); } catch {}
											done = true;
											return;
										}
									}
								} catch {}
								const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
								if ((now - startAt) >= fallbackMs) {
									try { overlay.classList.add('swap1-mid'); } catch {}
									done = true;
									return;
								}
								requestAnimationFrame(tick);
							}
							requestAnimationFrame(tick);
						}
						try {
							if (flip1 && flip1.addEventListener) {
								flip1.addEventListener('animationstart', scheduleFromAnimationStart, { once: true });
							}
						} catch {}
						// Fallback: if animationstart doesn't fire, begin watching shortly after.
						window.setTimeout(() => { if (!scheduled) scheduleFromAnimationStart(); }, 140);
					})();

					function startSecondFlip() {
						try {
							overlay.classList.remove('stage-1', 'is-turning-1', 'swap1-mid', 'swap1-under-right');
							overlay.classList.add('stage-2', 'is-turning-2');
						} catch {}
						// Flip #2: swap the RIGHT under-page immediately at flip start (prevents a snap).
						try { overlay.classList.add('swap2-under-right'); } catch {}
						// Flip #2: swap at the middle seam (matches the drag feel).
						(function scheduleFlip2MidSwapOnce() {
							let scheduled = false;
							function scheduleFromAnimationStart() {
								if (scheduled) return;
								scheduled = true;
								let done = false;
								const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
								const fallbackMs = Math.round(DOUBLE_MS * 0.5) + 40;
								function tick() {
									if (done) return;
									try {
										if (flip2 && window.getComputedStyle) {
											const ang = angleDegFromMatrix3d(window.getComputedStyle(flip2).transform);
											// 0 -> -180, seam at -90.
											if (typeof ang === 'number' && ang <= -90) {
												try { overlay.classList.add('swap2-mid'); } catch {}
												done = true;
												return;
											}
										}
									} catch {}
									const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
									if ((now - startAt) >= fallbackMs) {
										try { overlay.classList.add('swap2-mid'); } catch {}
										done = true;
										return;
									}
									requestAnimationFrame(tick);
								}
								requestAnimationFrame(tick);
							}
							try {
								if (flip2 && flip2.addEventListener) {
									flip2.addEventListener('animationstart', scheduleFromAnimationStart, { once: true });
								}
							} catch {}
							window.setTimeout(() => { if (!scheduled) scheduleFromAnimationStart(); }, 140);
						})();
						navigateAfterFlip({ element: flip2, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
					}

					try {
						if (flip1 && flip1.addEventListener) {
							flip1.addEventListener('animationend', startSecondFlip, { once: true });
						} else {
							window.setTimeout(startSecondFlip, DOUBLE_MS + 120);
						}
					} catch {
						window.setTimeout(startSecondFlip, DOUBLE_MS + 120);
					}

					// Hard fallback: start second flip even if animation events fail.
					window.setTimeout(() => {
						try { if (!overlay.classList.contains('stage-2')) startSecondFlip(); } catch {}
					}, DOUBLE_MS + 260);
				});
			});
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'contact.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startDoubleFlipToContact(a.href);
		}, true);

		// Preload the double overlay (and its iframes) so the 2nd-half backface isn't blank.
		(function preloadDoubleOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureDoubleOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();
	})();

	// Om mig -> Projekter: flip the LEFT page to the RIGHT side.
	(function initAboutToProjectsFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/about.html') && !path.endsWith('about.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.about-projects-transition');
			// If an old preloaded overlay exists from a previous version, rebuild it.
			try {
				if (overlay && !overlay.querySelector('.about-projects-turn__flip-backface')) {
					overlay.remove();
					overlay = null;
				}
			} catch {}
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'about-projects-transition';
				overlay.innerHTML = `
					<div class="about-projects-turn" aria-hidden="true">
						<div class="about-projects-turn__under about-projects-turn__under--left">
							<iframe class="about-projects-turn__frame about-projects-turn__frame--left about-projects-turn__under-frame about-projects-turn__under-frame--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-projects-turn__frame about-projects-turn__frame--left about-projects-turn__under-frame about-projects-turn__under-frame--projects" src="projects.html?preview=1" title="Projekter (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="about-projects-turn__under about-projects-turn__under--right">
							<iframe class="about-projects-turn__frame about-projects-turn__frame--right about-projects-turn__under-frame about-projects-turn__under-frame--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-projects-turn__frame about-projects-turn__frame--right about-projects-turn__under-frame about-projects-turn__under-frame--projects" src="projects.html?preview=1" title="Projekter (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="about-projects-turn__flip">
							<div class="about-projects-turn__flip-face about-projects-turn__flip-face--front">
								<!-- Swap DESIGN on the FLIPPING page at mid (50%): About LEFT -> Projects RIGHT -->
								<div class="about-projects-turn__flip-surface about-projects-turn__flip-surface--about">
									<iframe class="about-projects-turn__frame about-projects-turn__frame--left about-projects-turn__flip-front about-projects-turn__flip-front--about" src="about.html?preview=1" title="Om mig (left on turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								</div>
								<div class="about-projects-turn__flip-surface about-projects-turn__flip-surface--projects">
									<iframe class="about-projects-turn__frame about-projects-turn__frame--projects-right-on-flip about-projects-turn__flip-front about-projects-turn__flip-front--projects" src="projects.html?preview=1" title="Projekter (right page on turning sheet after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								</div>
							</div>
							<div class="about-projects-turn__flip-face about-projects-turn__flip-face--back">
								<iframe class="about-projects-turn__frame about-projects-turn__frame--projects-right-on-flip" src="projects.html?preview=1" title="Projekter (right page on flipped side)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<!-- Dedicated backface layer: keeps Projects RIGHT visible after mid (Safari-safe) -->
							<div class="about-projects-turn__flip-backface" aria-hidden="true">
								<iframe class="about-projects-turn__frame about-projects-turn__frame--projects-right-on-flip about-projects-turn__flip-backface-frame" src="projects.html?preview=1" title="Projekter (right page backface layer)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function prepOneFrame(fr) {
			try {
				if (!fr || !fr.contentDocument) return false;
				const doc = fr.contentDocument;
				doc.documentElement.classList.add('home-preview');
				doc.documentElement.classList.add('home-preview-reveal');
				fr.dataset.homePreviewReady = '1';
				// If we can access the document, it's same-origin. Mark as loaded
				// when readyState indicates it's already painted, so CSS opacity gates don't stay at 0.
				try {
					const rs = doc.readyState;
					if (rs && rs !== 'loading') fr.classList.add('is-loaded');
				} catch {}
				return true;
			} catch {
				return false;
			}
		}

		function markLoadedIfReady(fr) {
			try {
				if (!fr || fr.classList.contains('is-loaded')) return;
				const doc = fr.contentDocument;
				if (!doc) return;
				const rs = doc.readyState;
				if (rs && rs !== 'loading') fr.classList.add('is-loaded');
			} catch {}
		}

		function ensureLoadedSoon(fr, maxMs = 1800) {
			try {
				if (!fr || fr.classList.contains('is-loaded')) return;
				const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
				const tick = () => {
					try { markLoadedIfReady(fr); } catch {}
					if (fr.classList.contains('is-loaded')) return;
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					if ((now - startAt) >= maxMs) return;
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			} catch {}
		}

		function startFlipToProjects(targetHref) {
			const body = document.body;
			if (body.classList.contains('about-projects-flipping')) return;
			const existing = document.querySelector('.about-projects-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.about-projects-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			overlay.classList.remove('swap-under-right', 'swap-under-left', 'swap-flip-mid');
			try { overlay.classList.remove('is-preloading'); } catch {}
			const frames = Array.from(overlay.querySelectorAll('iframe'));
			frames.forEach((fr) => {
				// If the iframe is already loaded (common when we preloaded the overlay),
				// mark it immediately so the turning sheet isn't blank in the 2nd half.
				markLoadedIfReady(fr);
				// And keep polling briefly, because preloaded iframes can miss the `load` event handler.
				ensureLoadedSoon(fr, 2200);
				// Always mark as loaded on iframe load (works even if contentDocument access is blocked).
				try {
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
				} catch {}
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});
			// We rely on CSS paper fallbacks while iframes load (no blank flashes),
			// so we can always swap to the Projekter design at the right time.
			const underLeftProjects = overlay.querySelector('.about-projects-turn__under--left .about-projects-turn__under-frame--projects');
			try {
				if (underLeftProjects) {
					// If preloaded, the load event may have already fired.
					markLoadedIfReady(underLeftProjects);
					ensureLoadedSoon(underLeftProjects, 2200);
					if (underLeftProjects.classList.contains('is-loaded')) overlay.classList.add('swap-under-left-ready');
					underLeftProjects.addEventListener('load', () => overlay.classList.add('swap-under-left-ready'), { once: true });
				}
			} catch {}

			// IMPORTANT: avoid a 1-frame "blank" by showing overlay first,
			// then hiding the real page.
			body.classList.remove('about-projects-flip-half');
			overlay.classList.remove('is-turning', 'swap-under-right');

			requestAnimationFrame(() => {
				// Show overlay first (avoid any "nothing visible" frame), then hide the real page.
				overlay.classList.add('is-ready');

				requestAnimationFrame(() => {
					body.classList.add('about-projects-flip-active');
					body.classList.add('about-projects-flipping');
					body.style.overflow = 'hidden';

					overlay.classList.add('is-turning');
					window.setTimeout(() => {
						overlay.classList.add('swap-under-left');
					}, 60);
					// Timing tune (menu click): swap a bit AFTER the visual seam,
					// but once it appears it must stay on for the rest of the flip.
					const SWAP_FRAC = 0.58;
					const SWAP_DEG = 105; // seam=90deg, slightly after
					// Swap the FLIPPING page design at the visual seam (middle),
					// so the 2nd half of the turning sheet shows Projekter RIGHT.
					(function scheduleMidSwap() {
						let done = false;
						const flipEl = overlay.querySelector('.about-projects-turn__flip');
						if (!flipEl) {
							window.setTimeout(() => overlay.classList.add('swap-flip-mid'), Math.round(FLIP_MS * SWAP_FRAC));
							return;
						}
						const startWatcher = () => {
							const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
							const fallbackMs = Math.round(FLIP_MS * SWAP_FRAC) + 80;
							const tick = () => {
								if (done) return;
								try {
									const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
									// CSS rotateY can report +/- degrees depending on matrix convention.
									// Trigger after the seam once we reach ~105deg in either direction.
									if (typeof ang === 'number' && Math.abs(ang) >= SWAP_DEG) {
										done = true;
										overlay.classList.add('swap-flip-mid');
										return;
									}
								} catch {}
								const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
								if ((now - startAt) >= fallbackMs) {
									done = true;
									overlay.classList.add('swap-flip-mid');
									return;
								}
								requestAnimationFrame(tick);
							};
							requestAnimationFrame(tick);
						};
						try {
							flipEl.addEventListener('animationstart', startWatcher, { once: true });
							// If `animationstart` is missed, start shortly after.
							window.setTimeout(() => { if (!done) startWatcher(); }, 120);
						} catch {
							window.setTimeout(() => overlay.classList.add('swap-flip-mid'), Math.round(FLIP_MS * SWAP_FRAC));
						}
					})();
					// Keep OM MIG visible on the RIGHT page until the turning sheet covers it.
					// Then swap the right under-page to Projekter.
					window.setTimeout(() => {
						overlay.classList.add('swap-under-right');
					}, Math.round(FLIP_MS * 0.88));
				});
			});

			// No mid-flip swap needed: both faces are Projekter right page.

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.about-projects-turn__flip') : null;
			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'projects.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startFlipToProjects(a.href);
		}, true);

		// Preload the overlay (and its iframes) to avoid a brief "no design" flash.
		(function preloadOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();

		// Drag-to-turn (Om mig -> Projekter) from bottom-left corner.
		(function initAboutToProjectsDrag() {
			const DRAG_CLASS = 'about-projects-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round(window.innerWidth * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }
			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--left';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, x, seamX, flipEl, overlay) {
				progress = clamp01(p);
				const angle = 180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						// Left under-page: show Projekter as soon as the flip begins.
						if (progress > 0.02) overlay.classList.add('swap-under-left');
						else overlay.classList.remove('swap-under-left');

						// Flipping page: switch to Projekter exactly once we cross the middle seam while dragging.
						// This should feel like it changes right as the page passes the center.
						const cursorPastMiddle = (typeof x !== 'number' || typeof seamX !== 'number') ? (progress >= 0.5) : (x >= seamX);
						if (progress >= 0.5 && cursorPastMiddle) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');

						// Swap the right under-page late (matches existing logic).
						if (progress >= 0.88) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');
					}
				} catch {}
			}

			function cleanup(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'about-projects-flip-active', 'about-projects-flipping'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('about-projects-flip-active', 'about-projects-flipping', DRAG_CLASS);
				body.style.overflow = 'hidden';

				try {
					const old = document.querySelector('.about-projects-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				try { overlay.classList.remove('swap-flip-mid', 'swap-under-right'); } catch {}
				overlay.classList.add('is-ready', 'is-turning');
				// Ensure we mark frames as loaded during drag too (so CSS can fade them in).
				try {
					const frames = Array.from(overlay.querySelectorAll('iframe'));
					frames.forEach((fr) => {
						try { fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true }); } catch {}
						if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
					});
				} catch {}
				const flipEl = overlay.querySelector('.about-projects-turn__flip');

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Match Projects -> About drag distance:
					// startX -> seam (0..0.5), then seam -> right edge (0.5..1)
					let p = 0;
					if (x <= startX) {
						p = 0;
					} else if (x <= seamX) {
						const denom = Math.max(1, (seamX - startX));
						p = ((x - startX) / denom) * 0.5;
					} else {
						p = 0.5 + ((x - seamX) / Math.max(1, (vw - seamX))) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, x, seamX, flipEl, overlay);
						});
					}
				}

				function onUp() {
					window.removeEventListener('pointermove', onMove, true);
					window.removeEventListener('pointerup', onUp, true);
					window.removeEventListener('pointercancel', onUp, true);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanup(overlay, flipEl), 280);
						return;
					}

					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							const finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(180deg)';
						}
						overlay.classList.add('swap-under-right');
						// Ensure the flipping page design is swapped once we're committed past the middle.
						overlay.classList.add('swap-flip-mid');
					} catch {}
					window.setTimeout(() => { window.location.href = 'projects.html'; }, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				window.addEventListener('pointermove', onMove, true);
				window.addEventListener('pointerup', onUp, true);
				window.addEventListener('pointercancel', onUp, true);
			}

			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}
		})();
	})();

	// Om mig -> Kontakt: flip the RIGHT page to the LEFT side (same movement as other page turns).
	(function initAboutToContactFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/about.html') && !path.endsWith('about.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.about-contact-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'about-contact-transition';
				overlay.innerHTML = `
					<div class="about-contact-turn" aria-hidden="true">
						<div class="about-contact-turn__under about-contact-turn__under--left">
							<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__under-frame about-contact-turn__under-frame--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__under-frame about-contact-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="about-contact-turn__under about-contact-turn__under--right">
							<iframe class="about-contact-turn__frame about-contact-turn__frame--right about-contact-turn__under-frame about-contact-turn__under-frame--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="about-contact-turn__frame about-contact-turn__frame--right about-contact-turn__under-frame about-contact-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="about-contact-turn__flip">
							<div class="about-contact-turn__flip-face about-contact-turn__flip-face--front">
								<!-- Front of turning sheet: Om mig RIGHT page -->
								<iframe class="about-contact-turn__frame about-contact-turn__frame--right about-contact-turn__flip-front about-contact-turn__flip-front--about" src="about.html?preview=1" title="Om mig (right on turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<!-- Safety swap: after mid, force Kontakt LEFT design on the turning sheet (matches Projekter -> Kontakt pattern) -->
								<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__flip-front about-contact-turn__flip-front--contact" src="contact.html?preview=1" title="Kontakt (left on turning page after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="about-contact-turn__flip-face about-contact-turn__flip-face--back">
								<iframe class="about-contact-turn__frame about-contact-turn__frame--left about-contact-turn__flip-back" src="contact.html?preview=1" title="Kontakt (left on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startFlipToContact(targetHref) {
			const body = document.body;
			if (body.classList.contains('about-contact-flipping')) return;
			const existing = document.querySelector('.about-contact-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.about-contact-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			overlay.classList.remove('swap-under-right', 'swap-under-left', 'swap-flip-mid');
			try { overlay.classList.remove('is-preloading'); } catch {}

			// Make overlay visible BEFORE hiding the current page (prevents a 1-frame blank flash).
			try { overlay.classList.add('is-ready'); } catch {}

			body.classList.add('about-contact-flip-active');
			body.classList.add('about-contact-flipping');
			body.style.overflow = 'hidden';

			// Show overlay before hiding the page to avoid a blink.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					requestAnimationFrame(() => {
						overlay.classList.add('is-turning');
					});
				});
			});

			// As soon as the flip begins, the right side is covered, so we can swap it underneath.
			window.setTimeout(() => {
				overlay.classList.add('swap-under-right');
			}, 60);

			// Seam swap MUST match the real 90deg seam (easing makes time-based 50% snap).
			(function watchSeamOnce() {
				let done = false;
				let turningStartedAt = null;
				// Delay the visible swap slightly AFTER the middle for a smoother read.
				const fallbackMs = Math.round(FLIP_MS * 0.58) + 28;
				function tick() {
					if (done) return;
					// The watcher can start before `.is-turning` is applied (menu click path).
					// Keep polling until the flip actually starts, otherwise we never swap.
					if (!overlay.classList.contains('is-turning')) {
						requestAnimationFrame(tick);
						return;
					}
					try {
						if (turningStartedAt == null) {
							turningStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
						}
						const flipEl = overlay.querySelector('.about-contact-turn__flip');
						if (flipEl && window.getComputedStyle) {
							const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
							// About -> Contact flips right page left: 0 -> -180, seam at -90.
							// Swap a little after the seam (<= -105deg) to avoid looking "too quick".
							if (typeof ang === 'number' && ang <= -105) {
								// Only swap the FLIPPING page design at the seam.
								// Keep the LEFT under-page as "Om mig" until it is covered by the turning sheet.
								overlay.classList.add('swap-flip-mid');
								done = true;
								return;
							}
						}
					} catch {}
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					const base = (turningStartedAt == null) ? now : turningStartedAt;
					if ((now - base) >= fallbackMs) {
						try { overlay.classList.add('swap-flip-mid'); } catch {}
						done = true;
						return;
					}
					requestAnimationFrame(tick);
				}
				requestAnimationFrame(tick);
			})();

			// Swap the LEFT under-page very late (only after it's fully covered).
			(function watchLateUnderLeftOnce() {
				let done = false;
				let turningStartedAt = null;
				// Near the end of the turn. This is intentionally late to avoid showing Kontakt underneath too early.
				const fallbackMs = Math.round(FLIP_MS * 0.90);
				function tick() {
					if (done) return;
					if (!overlay.classList.contains('is-turning')) {
						requestAnimationFrame(tick);
						return;
					}
					try {
						if (turningStartedAt == null) {
							turningStartedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
						}
						const flipEl = overlay.querySelector('.about-contact-turn__flip');
						if (flipEl && window.getComputedStyle) {
							const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
							// Close to fully turned (covered).
							if (typeof ang === 'number' && ang <= -165) {
								overlay.classList.add('swap-under-left');
								done = true;
								return;
							}
						}
					} catch {}
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					const base = (turningStartedAt == null) ? now : turningStartedAt;
					if ((now - base) >= fallbackMs) {
						try { overlay.classList.add('swap-under-left'); } catch {}
						done = true;
						return;
					}
					requestAnimationFrame(tick);
				}
				requestAnimationFrame(tick);
			})();

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.about-contact-turn__flip') : null;
			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'contact.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startFlipToContact(a.href);
		}, true);

		// Preload the overlay (and its iframes) to avoid a brief "no design" flash.
		(function preloadOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();

		// Drag-to-turn (Om mig -> Kontakt) from bottom-right corner.
		(function initAboutToContactDrag() {
			const DRAG_CLASS = 'about-contact-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round(window.innerWidth * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }
			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--right';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, x, seamX, flipEl, overlay) {
				progress = clamp01(p);
				const angle = -180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						// Right under-page can switch immediately (it's covered by the turning sheet early).
						if (progress > 0.02) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');

						// Flipping sheet: swap exactly at the middle seam while dragging.
						// For a RIGHT->LEFT drag, "past middle" means cursor has crossed to the left side of the seam.
						const cursorPastMiddle = (typeof x === 'number' && typeof seamX === 'number') ? (x <= seamX) : (progress >= 0.5);
						if (progress >= 0.5 && cursorPastMiddle) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');

						// Left under-page should stay "Om mig" until it's covered by the turning sheet.
						// So swap very late.
						if (progress >= 0.92) overlay.classList.add('swap-under-left');
						else overlay.classList.remove('swap-under-left');

					}
				} catch {}
			}

			function cleanup(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'about-contact-flip-active', 'about-contact-flipping'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('about-contact-flip-active', 'about-contact-flipping', DRAG_CLASS);
				body.style.overflow = 'hidden';

				try {
					const old = document.querySelector('.about-contact-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				overlay.classList.add('is-ready', 'is-turning');
				const flipEl = overlay.querySelector('.about-contact-turn__flip');

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Map drag distance to seam-aware progress:
					// startX -> seam = 0..0.5, seam -> left edge = 0.5..1
					let p = 0;
					if (x >= startX) {
						p = 0;
					} else if (x >= seamX) {
						const denom = Math.max(1, (startX - seamX));
						p = ((startX - x) / denom) * 0.5;
					} else {
						p = 0.5 + ((seamX - x) / Math.max(1, seamX)) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, x, seamX, flipEl, overlay);
						});
					}
				}

				function onUp() {
					window.removeEventListener('pointermove', onMove, true);
					window.removeEventListener('pointerup', onUp, true);
					window.removeEventListener('pointercancel', onUp, true);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanup(overlay, flipEl), 280);
						return;
					}

					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							const finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(-180deg)';
						}
						overlay.classList.add('swap-under-right');

						// If the user releases right after passing the middle, we still need to swap the turning-sheet design
						// during the finishing animation (pointermove events stop after pointerup).
						const SWAP_P = 0.50; // exactly at the middle
						if (progress >= SWAP_P) {
							overlay.classList.add('swap-flip-mid');
						} else {
							const remainingP = Math.max(0.0001, 1 - progress);
							const untilSwapP = Math.max(0, SWAP_P - progress);
							const delayMs = Math.round(Math.max(0, Math.min(finishMs, finishMs * (untilSwapP / remainingP))));
							window.setTimeout(() => {
								try { overlay.classList.add('swap-flip-mid'); } catch {}
							}, delayMs);
						}

						// Keep the left under-page as Om mig until the sheet has covered it (swap very late).
						window.setTimeout(() => {
							try { overlay.classList.add('swap-under-left'); } catch {}
						}, Math.round(Math.max(0, finishMs - 40)));
					} catch {}
					window.setTimeout(() => { window.location.href = 'contact.html'; }, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				window.addEventListener('pointermove', onMove, true);
				window.addEventListener('pointerup', onUp, true);
				window.addEventListener('pointercancel', onUp, true);
			}

			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}
		})();
	})();

	// Kontakt -> Om mig: flip the LEFT page to the RIGHT side (reverse direction).
	(function initContactToAboutFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/contact.html') && !path.endsWith('contact.html')) return;
		} catch {
			return;
		}

		const FLIP_MS = getPageFlipMs(4200);
		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.contact-about-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'contact-about-transition';
				overlay.innerHTML = `
					<div class="contact-about-turn" aria-hidden="true">
						<div class="contact-about-turn__under contact-about-turn__under--left">
							<iframe class="contact-about-turn__frame contact-about-turn__frame--left contact-about-turn__under-frame contact-about-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="contact-about-turn__frame contact-about-turn__frame--left contact-about-turn__under-frame contact-about-turn__under-frame--about" src="about.html?preview=1" title="Om mig (left under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="contact-about-turn__under contact-about-turn__under--right">
							<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__under-frame contact-about-turn__under-frame--contact" src="contact.html?preview=1" title="Kontakt (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__under-frame contact-about-turn__under-frame--about" src="about.html?preview=1" title="Om mig (right under)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<div class="contact-about-turn__flip">
							<div class="contact-about-turn__flip-face contact-about-turn__flip-face--front">
								<!-- Swap DESIGN on the FLIPPING page at mid (50%) -->
								<iframe class="contact-about-turn__frame contact-about-turn__frame--left contact-about-turn__flip-front contact-about-turn__flip-front--contact" src="contact.html?preview=1" title="Kontakt (left turning page)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
								<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__flip-front contact-about-turn__flip-front--about" src="about.html?preview=1" title="Om mig (right turning page after mid)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="contact-about-turn__flip-face contact-about-turn__flip-face--back">
								<iframe class="contact-about-turn__frame contact-about-turn__frame--right contact-about-turn__flip-back" src="about.html?preview=1" title="Om mig (right on backface)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startFlipToAbout(targetHref) {
			const body = document.body;
			if (body.classList.contains('contact-about-flipping')) return;
			const existing = document.querySelector('.contact-about-transition');
			if (existing && !existing.classList.contains('is-preloading')) return;

			try {
				const old = document.querySelector('.contact-about-transition');
				// If we're preloading, reuse the overlay instead of removing it.
				if (old && !old.classList.contains('is-preloading')) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			overlay.classList.remove('swap-under-left', 'swap-under-right', 'swap-flip-mid');
			try { overlay.classList.remove('is-preloading'); } catch {}

			// Make overlay visible BEFORE hiding the current page (prevents a 1-frame blank flash).
			try { overlay.classList.add('is-ready'); } catch {}

			body.classList.add('contact-about-flip-active');
			body.classList.add('contact-about-flipping');
			body.style.overflow = 'hidden';

			// Delay the turning-sheet design swap slightly AFTER the visual midpoint,
			// so it changes when the page moves past the center into the right side.
			const FLIP_SHEET_SWAP_T = 0.60;

			const flipEl = overlay && overlay.querySelector ? overlay.querySelector('.contact-about-turn__flip') : null;
			let midSwapScheduled = false;
			let underSwapScheduled = false;
			function scheduleMidSwapFromNow() {
				if (midSwapScheduled) return;
				midSwapScheduled = true;
				window.setTimeout(() => {
					try { overlay.classList.add('swap-flip-mid'); } catch {}
				}, Math.round(FLIP_MS * FLIP_SHEET_SWAP_T));
			}
			function scheduleUnderSwapsFromNow() {
				if (underSwapScheduled) return;
				underSwapScheduled = true;
				// Left under-page can change early (it becomes visible quickly).
				window.setTimeout(() => {
					try { overlay.classList.add('swap-under-left'); } catch {}
				}, 60);
				// Right under-page (CV/right page) must change very late.
				window.setTimeout(() => {
					try { overlay.classList.add('swap-under-right'); } catch {}
				}, Math.round(FLIP_MS * 0.985));
			}

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					requestAnimationFrame(() => {
						overlay.classList.add('is-turning');
						// Start the 50% timer when the animation actually starts painting.
						try {
							if (flipEl && flipEl.addEventListener) {
								flipEl.addEventListener('animationstart', () => {
									scheduleMidSwapFromNow();
									scheduleUnderSwapsFromNow();
								}, { once: true });
							}
						} catch {}
						// Fallback: if animationstart doesn't fire, schedule shortly after turning begins.
						window.setTimeout(() => {
							if (!midSwapScheduled) scheduleMidSwapFromNow();
							if (!underSwapScheduled) scheduleUnderSwapsFromNow();
						}, 120);
					});
				});
			});

			navigateAfterFlip({ element: flipEl, fallbackMs: FLIP_MS + NAV_MS, href: targetHref });
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			const hrefLower = hrefAttr.toLowerCase();
			if (!(hrefLower === 'about.html' || hrefLower.startsWith('about.html#') || hrefLower.startsWith('about.html?'))) return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startFlipToAbout(a.href);
		}, true);

		// Preload the overlay (and its iframes) to avoid a brief "no design" flash.
		(function preloadOnce() {
			try {
				if (document.documentElement.classList.contains('transition-preview')) return;
				const ov = ensureOverlay();
				ov.classList.add('is-preloading');
			} catch {}
		})();

		// Drag-to-turn (Kontakt -> Om mig) from bottom-left corner.
		(function initContactToAboutDrag() {
			const DRAG_CLASS = 'contact-about-dragging';
			const COMPLETE_THRESHOLD = 0.5; // only commit after passing the middle
			const DRAG_PX = Math.max(260, Math.min(520, Math.round(window.innerWidth * 0.38)));

			let handle = null;
			let dragging = false;
			let startX = 0;
			let progress = 0;
			let rafId = 0;

			function clamp01(x) { return Math.max(0, Math.min(1, x)); }
			function ensureHandle() {
				if (handle && document.body.contains(handle)) return handle;
				handle = document.createElement('div');
				handle.className = 'page-turn-handle page-turn-handle--left';
				handle.setAttribute('aria-hidden', 'true');
				document.body.appendChild(handle);
				return handle;
			}

			function setProgress(p, x, seamX, flipEl, overlay) {
				progress = clamp01(p);
				const angle = 180 * progress;
				try {
					if (flipEl) {
						flipEl.style.animation = 'none';
						flipEl.style.transition = 'none';
						flipEl.style.transform = `rotateY(${angle}deg)`;
					}
				} catch {}

				try {
					if (overlay) {
						// Change DESIGN on the flipping page exactly when crossing the middle seam.
						const cursorPastMiddle = (typeof x === 'number' && typeof seamX === 'number') ? (x >= seamX) : (progress >= 0.5);
						if (progress >= 0.5 && cursorPastMiddle) overlay.classList.add('swap-flip-mid');
						else overlay.classList.remove('swap-flip-mid');

						// Show Om mig LEFT page underneath as soon as the flip begins.
						if (progress > 0.02) overlay.classList.add('swap-under-left');
						else overlay.classList.remove('swap-under-left');

						// Keep the visible right page as Kontakt until very late.
						if (progress >= 0.985) overlay.classList.add('swap-under-right');
						else overlay.classList.remove('swap-under-right');
					}
				} catch {}
			}

			function cleanup(overlay, flipEl) {
				dragging = false;
				if (rafId) cancelAnimationFrame(rafId);
				rafId = 0;
				try { document.body.classList.remove(DRAG_CLASS, 'contact-about-flip-active', 'contact-about-flipping'); } catch {}
				try { document.body.style.overflow = ''; } catch {}
				try { if (overlay && overlay.parentNode) overlay.remove(); } catch {}
				try {
					if (flipEl) {
						flipEl.style.transition = '';
						flipEl.style.animation = '';
						flipEl.style.transform = '';
					}
				} catch {}
			}

			function startDrag(e) {
				if (dragging) return;
				if (!e || e.button !== 0) return;
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();

				dragging = true;
				startX = e.clientX;

				const body = document.body;
				body.classList.add('contact-about-flip-active', 'contact-about-flipping', DRAG_CLASS);
				body.style.overflow = 'hidden';

				try {
					const old = document.querySelector('.contact-about-transition');
					if (old) old.remove();
				} catch {}

				const overlay = ensureOverlay();
				overlay.classList.add('is-ready', 'is-turning');
				const flipEl = overlay.querySelector('.contact-about-turn__flip');

				function onMove(ev) {
					if (!dragging) return;
					const x = (ev && typeof ev.clientX === 'number') ? ev.clientX : startX;
					const vw = window.innerWidth || 1;
					const seamX = vw * 0.5;

					// Map drag distance to seam-aware progress:
					// startX -> seam = 0..0.5, seam -> right edge = 0.5..1
					let p = 0;
					if (x <= startX) {
						p = 0;
					} else if (x <= seamX) {
						const denom = Math.max(1, (seamX - startX));
						p = ((x - startX) / denom) * 0.5;
					} else {
						p = 0.5 + ((x - seamX) / Math.max(1, (vw - seamX))) * 0.5;
					}
					if (!rafId) {
						rafId = requestAnimationFrame(() => {
							rafId = 0;
							setProgress(p, x, seamX, flipEl, overlay);
						});
					}
				}

				function onUp() {
					window.removeEventListener('pointermove', onMove, true);
					window.removeEventListener('pointerup', onUp, true);
					window.removeEventListener('pointercancel', onUp, true);

					const shouldComplete = progress >= COMPLETE_THRESHOLD;
					if (!shouldComplete) {
						try {
							if (flipEl) {
								flipEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1)';
								flipEl.style.transform = 'rotateY(0deg)';
							}
						} catch {}
						window.setTimeout(() => cleanup(overlay, flipEl), 280);
						return;
					}

					try {
						if (flipEl) {
							const ease = getPageFlipEase('cubic-bezier(.42,0,.58,1)');
							const remaining = Math.max(0, 1 - progress);
							const finishMs = Math.round(Math.max(420, Math.min(FLIP_MS, FLIP_MS * remaining)));
							flipEl.style.transition = `transform ${finishMs}ms ${ease}`;
							flipEl.style.transform = 'rotateY(180deg)';
						}
						// Once we're committing the flip (only possible after 50%), ensure the turning sheet has swapped.
						overlay.classList.add('swap-flip-mid');
						// Ensure the RIGHT under-page (CV) doesn't appear early.
						// Left under-page should be visible quickly, but right under-page should only swap at the very end.
						overlay.classList.add('swap-under-left');
						window.setTimeout(() => {
							try { overlay.classList.add('swap-under-right'); } catch {}
						}, Math.round(Math.max(0, finishMs - 40)));
					} catch {}
					window.setTimeout(() => { window.location.href = 'about.html'; }, Math.round(Math.max(520, Math.min(FLIP_MS + 140, (FLIP_MS * (1 - progress)) + 260))));
				}

				window.addEventListener('pointermove', onMove, true);
				window.addEventListener('pointerup', onUp, true);
				window.addEventListener('pointercancel', onUp, true);
			}

			const h = ensureHandle();
			try {
				h.addEventListener('pointerdown', (e) => {
					try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch {}
					startDrag(e);
				});
			} catch {}
		})();
	})();

	// Matrix-ish text morph (scramble -> resolve).
	function matrixMorphText(el, finalText, opts = {}) {
		if (!el) return;
		const {
			// one-character-at-a-time pacing
			stepMs = 55,
			stepMinMs,
			stepMaxMs,
			easeInOut = false,
			flickerSteps = 4,
			flickerMs = 20,
			charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
			startDelayMs = 0,
			keepSpaces = true,
			lockedClass = 'matrix-char',
			orderMode = 'ltr', // 'ltr' | 'random' | 'center-out'
			dropClass = 'matrix-drop',
			// If omitted, we start from whatever the element currently shows (handwritten text, or "0000" noise, etc.)
			initialText,
			onComplete
		} = opts;

		const target = String(finalText ?? '');
		const len = target.length;
		const randChar = () => charset[Math.floor(Math.random() * charset.length)] || '0';
		const isSpace = (ch) => (keepSpaces && ch === ' ');

		function stepDelayMsAt(t01) {
			if (!easeInOut) return Math.max(0, stepMs);
			const mid = Math.max(0, stepMs);
			const min = Math.max(0, stepMinMs ?? Math.round(mid * 0.70));
			const max = Math.max(min, stepMaxMs ?? Math.round(mid * 1.70));
			// Ease-in-out by timing (slow at ends, fast in middle).
			const c = Math.cos(Math.PI * Math.min(1, Math.max(0, t01)));
			const endBoost = c * c; // 1 at ends, 0 at middle
			return Math.round(min + (max - min) * endBoost);
		}

		function shuffleInPlace(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		}

		const start = () => {
			// Start from existing text (handwritten), then convert one letter at a time to Matrix font.
			const startText = String(initialText ?? el.textContent ?? target);
			const base = (startText + target).slice(0, len); // ensure length >= target

			// Build per-letter spans so font can change per character.
			el.textContent = '';
			const spans = new Array(len);
			for (let i = 0; i < len; i++) {
				const ch = base[i] ?? target[i] ?? '';
				const sp = document.createElement('span');
				if (keepSpaces && ch === ' ') {
					sp.classList.add('matrix-space');
					sp.textContent = '\u00A0';
				} else {
					sp.textContent = ch;
				}
				spans[i] = sp;
				el.appendChild(sp);
			}

			// Decide order of letters to transform (skip spaces).
			const order = [];
			for (let i = 0; i < len; i++) if (!isSpace(target[i])) order.push(i);
			if (orderMode === 'random') {
				shuffleInPlace(order);
			} else if (orderMode === 'center-out') {
				order.sort((a, b) => {
					const ca = Math.abs(a - (len - 1) / 2);
					const cb = Math.abs(b - (len - 1) / 2);
					return ca - cb;
				});
			}

			let orderPos = 0;
			const denom = Math.max(1, order.length - 1);
			const nextDelay = () => stepDelayMsAt(orderPos / denom);
			function nextChar() {
				if (orderPos >= order.length) {
					// Ensure exact final text.
					for (let i = 0; i < len; i++) {
						if (keepSpaces && target[i] === ' ') {
							spans[i].classList.add('matrix-space');
							spans[i].textContent = '\u00A0';
						} else {
							spans[i].textContent = target[i];
						}
					}
					try { if (typeof onComplete === 'function') onComplete(); } catch {}
					return;
				}
				const idx = order[orderPos];

				let f = 0;
				function flicker() {
					// Switch THIS letter into matrix font while it scrambles.
					try {
						spans[idx].classList.add(lockedClass);
						if (dropClass) spans[idx].classList.add(dropClass);
					} catch {}
					if (f < flickerSteps) {
						spans[idx].textContent = randChar();
						f += 1;
						window.setTimeout(flicker, Math.max(0, flickerMs));
						return;
					}
					// lock final char
					spans[idx].textContent = target[idx];
					try { if (dropClass) spans[idx].classList.remove(dropClass); } catch {}
					orderPos += 1;
					window.setTimeout(nextChar, nextDelay());
				}
				flicker();
			}

			nextChar();
		};

		if (startDelayMs > 0) window.setTimeout(start, startDelayMs);
		else start();
	}

	function renderMatrixHeadline(el, text) {
		if (!el) return;
		const s = String(text ?? '');
		el.textContent = '';
		for (let i = 0; i < s.length; i++) {
			const ch = s[i];
			if (ch === ' ') {
				const sp = document.createElement('span');
				sp.className = 'matrix-space';
				sp.textContent = '\u00A0';
				el.appendChild(sp);
				continue;
			}
			const sp = document.createElement('span');
			sp.className = 'matrix-char';
			sp.textContent = ch;
			el.appendChild(sp);
		}
	}

	function getMatrixTextBounds(el) {
		try {
			const chars = el ? Array.from(el.querySelectorAll('.matrix-char, .matrix-space')) : [];
			if (!chars.length) return el ? el.getBoundingClientRect() : null;
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			let seen = false;
			for (const ch of chars) {
				const r = ch.getBoundingClientRect();
				if (!r || !(r.width > 0 || r.height > 0)) continue;
				seen = true;
				minX = Math.min(minX, r.x);
				minY = Math.min(minY, r.y);
				maxX = Math.max(maxX, r.x + r.width);
				maxY = Math.max(maxY, r.y + r.height);
			}
			if (!seen) return el ? el.getBoundingClientRect() : null;
			// Snap to pixel grid to avoid subpixel mismatch between layers.
			const x = Math.round(minX);
			const y = Math.round(minY);
			const w = Math.round(maxX - minX);
			const h = Math.round(maxY - minY);
			return { x, y, w, h };
		} catch {
			return el ? el.getBoundingClientRect() : null;
		}
	}

	// "Mit AI Univers": close the book and slide to center.
	(function initAiUniverseCloseTransition() {
		// Even faster close (book appears sooner)
		const CLOSE_MS = 800;
		const SLIDE_MS = 520;
		const MORPH_TEXT = 'MIT AI UNIVERS';
		// Slightly slower, still one letter at a time (non left-to-right).
		const MORPH_OPTS = { stepMs: 55, easeInOut: true, flickerSteps: 3, flickerMs: 16, orderMode: 'random' };
		const RISE_MS = 900;
		const GLITCH_MS = 460;
		const NAV_MS = 140;
		const BASE_SHIFT_Y = 0;
		const HANDOFF_MS = 240;

		function ensureRevealFrame(overlay) {
			try {
				let wrap = overlay.querySelector('.ai-universe-reveal');
				if (!wrap) {
					wrap = document.createElement('div');
					wrap.className = 'ai-universe-reveal';
					wrap.innerHTML = `<iframe src="ai-universe.html?preview=1&reveal=1" title="AI Universe (reveal)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>`;
					overlay.appendChild(wrap);
				}
				return wrap.querySelector('iframe');
			} catch {
				return null;
			}
		}

		function ensureMeasureFrame(overlay) {
			try {
				let fr = overlay.querySelector('iframe.ai-universe-measure');
				if (fr) return fr;
				fr = document.createElement('iframe');
				fr.className = 'ai-universe-measure';
				// preview=1 prevents normal enter/morph scripts; measure=1 makes the iframe postMessage its h1 position.
				fr.src = 'ai-universe.html?preview=1&measure=1';
				fr.title = 'AI universe measure (hidden)';
				fr.tabIndex = -1;
				fr.setAttribute('aria-hidden', 'true');
				fr.style.position = 'fixed';
				fr.style.inset = '0';
				fr.style.width = '100vw';
				fr.style.height = '100vh';
				fr.style.border = '0';
				fr.style.opacity = '0';
				fr.style.pointerEvents = 'none';
				fr.style.zIndex = '-1';
				overlay.appendChild(fr);
				return fr;
			} catch {
				return null;
			}
		}

		function waitForAiHeadlineRect(measureFrame, done) {
			let finished = false;
			const finish = (val) => {
				if (finished) return;
				finished = true;
				try { window.removeEventListener('message', onMsg); } catch {}
				try { done && done(val); } catch {}
			};
			const onMsg = (e) => {
				const d = e && e.data;
				if (!d || typeof d !== 'object') return;
				if (d.__msk !== 'ai_universe_measure') return;
				const r = d.rect;
				if (!r || typeof r !== 'object') return;
				if (typeof r.x !== 'number' || typeof r.y !== 'number' || typeof r.w !== 'number' || typeof r.h !== 'number') return;
				finish(r);
			};
			window.addEventListener('message', onMsg);

			// Ask the iframe to report *now* (avoids missing an earlier postMessage).
			try {
				const win = measureFrame && measureFrame.contentWindow;
				if (win) win.postMessage({ __msk: 'ai_universe_measure_req' }, '*');
			} catch {}

			// Retry a few times (iframe load timing can vary).
			let tries = 0;
			const retry = () => {
				if (finished) return;
				tries += 1;
				try {
					const win = measureFrame && measureFrame.contentWindow;
					if (win) win.postMessage({ __msk: 'ai_universe_measure_req' }, '*');
				} catch {}
				if (tries < 6) window.setTimeout(retry, 140);
			};
			window.setTimeout(retry, 60);

			// Absolute timeout: continue even if iframe never reports.
			window.setTimeout(() => finish(null), 1600);
		}

		function riseTitleToAiHeadline(titleEl, measureFrame, done) {
			if (!titleEl) { try { done && done(); } catch {} return; }
			// Fail-safe: if we can't measure, don't block the transition.
			if (!measureFrame) { try { done && done(); } catch {} return; }

			let doneCalled = false;
			const safeDone = () => {
				if (doneCalled) return;
				doneCalled = true;
				try { done && done(); } catch {}
			};

			waitForAiHeadlineRect(measureFrame, (targetRect) => {
				if (!targetRect) { safeDone(); return; }

				// Wait for the final "morphed" layout to settle.
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						const r0 = getMatrixTextBounds(titleEl) || titleEl.getBoundingClientRect();
						const curCx = r0.x + (r0.w / 2);
						const curCy = r0.y + (r0.h / 2);
						const tgtCx = targetRect.x + (targetRect.w / 2);
						const tgtCy = targetRect.y + (targetRect.h / 2);
						const dx = Math.round(tgtCx - curCx);
						const dy = Math.round(tgtCy - curCy);
						const s = (r0.w > 1) ? (targetRect.w / r0.w) : 1;

						// Animate by updating the CSS variable used in transform.
						titleEl.style.setProperty('--aiTitleShiftX', `${dx}px`);
						titleEl.style.setProperty('--aiTitleShiftY', `${BASE_SHIFT_Y + dy}px`);
						titleEl.style.setProperty('--aiTitleScale', `${Math.max(0.6, Math.min(1.8, s)).toFixed(4)}`);

						let finished = false;
						const finish = () => {
							if (finished) return;
							finished = true;
							try { titleEl.removeEventListener('transitionend', onEnd); } catch {}
							safeDone();
						};
						const onEnd = (e) => {
							if (!e || e.propertyName !== 'transform') return;
							finish();
						};
						try { titleEl.addEventListener('transitionend', onEnd, { once: true }); } catch {}
						window.setTimeout(finish, RISE_MS + 160);
					});
				});
			});
		}

		function ensureOverlay() {
			let overlay = document.querySelector('.ai-close-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'ai-close-transition';
				overlay.innerHTML = `
					<div class="ai-close ai-close--opened" aria-hidden="true">
						<main class="home-notebook" role="main" aria-label="Closing book transition">
							<div class="home-notebook__pages" aria-hidden="true"></div>
							<div class="home-notebook__cover" aria-hidden="true">
								<div class="home-notebook__cover-back" aria-hidden="true"></div>
							</div>
							<div class="home-notebook__leaf-fan" aria-hidden="true"></div>
							<div class="home-notebook__spread" aria-hidden="true"></div>
							<h1 class="home-notebook__title" data-text="Mikkels notesbog">Mikkels notesbog</h1>
						</main>
					</div>
					<div class="ai-close ai-close--closed" aria-hidden="true">
						<main class="home-notebook" role="main" aria-label="Closed book transition">
							<div class="home-notebook__pages" aria-hidden="true"></div>
							<div class="home-notebook__cover" aria-hidden="true">
								<div class="home-notebook__cover-back" aria-hidden="true"></div>
							</div>
							<div class="home-notebook__leaf-fan" aria-hidden="true"></div>
							<h1 class="home-notebook__title" data-text="Mikkels notesbog">Mikkels notesbog</h1>
						</main>
						<div class="ai-back-title" aria-hidden="true">MIT AI UNIVERS</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		// Pre-warm the overlay so the first click is instant.
		let didPrewarm = false;
		function prewarmOverlay() {
			if (didPrewarm) return;
			didPrewarm = true;
			try {
				// Only create the overlay container (fast).
				// Heavy iframes are created lazily later to keep animations smooth.
				ensureOverlay();
			} catch {}
		}

		function startAiClose(targetHref) {
			const body = document.body;
			if (!body || body.classList.contains('ai-close-active')) return;

			try {
				// Ensure we already have the overlay in DOM (prewarm does this too).
				prewarmOverlay();
			} catch {}

			const overlay = ensureOverlay();
			// Lazy-create these later (they're heavy).
			let measureFrame = null;
			let revealFrame = null;

			// Reset any previous run state.
			try {
				overlay.classList.remove(
					'is-ready',
					'is-closing',
					'show-closed',
					'is-sliding',
					'is-glitching',
					'book-gone',
					'reveal-ai',
					'handoff'
				);
			} catch {}

			body.style.overflow = 'hidden';

			// Tell the destination page to play the same headline morph on load.
			try {
				window.sessionStorage.setItem('ai_universe_matrix_headline', MORPH_TEXT);
				window.sessionStorage.setItem('ai_universe_matrix_ts', String(Date.now()));
				// Also trigger a smooth background "enter" on the destination page.
				window.sessionStorage.setItem('ai_universe_enter', '1');
			} catch {}

			// IMPORTANT: show the overlay first, THEN hide the page.
			// Otherwise there's a split-second where everything is hidden and looks blank.
			overlay.classList.add('is-ready');
			requestAnimationFrame(() => {
				body.classList.add('ai-close-active');
				// Start the close immediately (keeps book motion smooth).
				requestAnimationFrame(() => overlay.classList.add('is-closing'));
			});

			// Switch to closed book and slide it to center.
			window.setTimeout(() => {
				overlay.classList.add('show-closed');
				requestAnimationFrame(() => {
					overlay.classList.add('is-sliding');
				});

				// ONLY when the book is centered: "MIT AI UNIVERS" morphs Matrix-style.
				try {
					const titleEl = overlay.querySelector('.ai-close--closed .ai-back-title');
					if (titleEl) {
						window.setTimeout(() => {
							try {
								// Styling hooks (do NOT change font globally; per-letter spans handle that).
								titleEl.classList.add('is-matrix');
								// One letter at a time.
								matrixMorphText(titleEl, MORPH_TEXT, {
									...MORPH_OPTS,
									lockedClass: 'matrix-char',
									dropClass: 'matrix-drop',
									onComplete: () => {
										// 1) As soon as the text is fully morphed: make the BOOK glitch away immediately.
										try { overlay.classList.add('is-glitching'); } catch {}

										// 2) Only AFTER the book is gone: move the text up to the subpage headline position.
										const afterBookGone = () => {
											try { titleEl.classList.add('is-rising'); } catch {}
											// Ensure starting shift is known for the delta calc.
											try {
												titleEl.style.setProperty('--aiTitleShiftX', `0px`);
												titleEl.style.setProperty('--aiTitleShiftY', `${BASE_SHIFT_Y}px`);
												titleEl.style.setProperty('--aiTitleScale', `1`);
											} catch {}

											measureFrame = measureFrame || ensureMeasureFrame(overlay);
											riseTitleToAiHeadline(titleEl, measureFrame, () => {
												// 3) Reveal the AI page behind, then hand off the title into the infobox headline.
												try { overlay.classList.add('reveal-ai'); } catch {}
												revealFrame = revealFrame || ensureRevealFrame(overlay);

												// Make the infobox headline match the EXACT end position/size of the moving title.
												try {
												const r = getMatrixTextBounds(titleEl) || titleEl.getBoundingClientRect();
												const snapped = {
													x: Math.round(r.x),
													y: Math.round(r.y),
													w: Math.round(r.w ?? r.width),
													h: Math.round(r.h ?? r.height)
												};
													const payload = {
														__msk: 'ai_reveal_set_headline_rect',
													rect: snapped,
														vw: window.innerWidth,
														vh: window.innerHeight
													};
												revealFrame && revealFrame.contentWindow && revealFrame.contentWindow.postMessage(payload, '*');
												} catch {}

											const waitRectAppliedThenHandoff = () => {
												let doneOnce = false;
												const finish = () => {
													if (doneOnce) return;
													doneOnce = true;
													try { window.removeEventListener('message', onMsg); } catch {}
													// show reveal headline, then fade out overlay title in the next frame
													try { revealFrame && revealFrame.contentWindow && revealFrame.contentWindow.postMessage({ __msk: 'ai_reveal_show_headline' }, '*'); } catch {}
													requestAnimationFrame(() => {
														try { overlay.classList.add('handoff'); } catch {}
													});
												};
												const onMsg = (e) => {
													const d = e && e.data;
													if (!d || typeof d !== 'object') return;
													if (d.__msk !== 'ai_reveal_rect_applied') return;
													finish();
												};
												window.addEventListener('message', onMsg);
												window.setTimeout(finish, 220); // fallback if ack is missed
											};

											const trySetRect = () => {
												try {
													const r = getMatrixTextBounds(titleEl) || titleEl.getBoundingClientRect();
													const payload = {
														__msk: 'ai_reveal_set_headline_rect',
														rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w ?? r.width), h: Math.round(r.h ?? r.height) },
														vw: window.innerWidth,
														vh: window.innerHeight
													};
													revealFrame && revealFrame.contentWindow && revealFrame.contentWindow.postMessage(payload, '*');
												} catch {}
											};

											waitRectAppliedThenHandoff();
											trySetRect();

												try {
													if (revealFrame) {
													// If not loaded yet, wait once then re-send rect.
													revealFrame.addEventListener('load', () => trySetRect(), { once: true });
													}
												} catch {}

												// Tell destination page: headline is already aligned on-screen.
												try { window.sessionStorage.setItem('ai_universe_aligned', '1'); } catch {}

												// Navigate shortly after handoff.
												window.setTimeout(() => {
													window.location.href = targetHref;
												}, HANDOFF_MS + NAV_MS);
											});
										};

										// Prefer real animation end (no guessing). Fallback to timeout.
										try {
											const bookEl = overlay.querySelector('.ai-close--closed .home-notebook');
											if (bookEl) {
												const onEnd = (e) => {
													if (!e || e.animationName !== 'matrixGlitchAway') return;
													try { overlay.classList.add('book-gone'); } catch {}
													try { bookEl.removeEventListener('animationend', onEnd); } catch {}
													afterBookGone();
												};
												bookEl.addEventListener('animationend', onEnd);
												// Hard fallback in case animationend doesn't fire.
												window.setTimeout(() => {
													try { overlay.classList.add('book-gone'); } catch {}
													try { bookEl.removeEventListener('animationend', onEnd); } catch {}
													afterBookGone();
												}, GLITCH_MS + 120);
												return;
											}
										} catch {}

										window.setTimeout(afterBookGone, GLITCH_MS + 120);
									}
								});
							} catch {}
						}, Math.max(0, SLIDE_MS));
					}
				} catch {}
			}, CLOSE_MS);
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'ai-universe.html') return;
			// If already on AI page, allow default.
			try {
				const path = (window.location.pathname || '').toLowerCase();
				if (path.endsWith('/ai-universe.html') || path.endsWith('ai-universe.html')) return;
			} catch {}
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			try { e.stopImmediatePropagation(); } catch {}
			startAiClose(a.href);
		}, true);

		// Prewarm ASAP after load (doesn't show anything, just builds DOM/iframes).
		try {
			if ('requestIdleCallback' in window) {
				window.requestIdleCallback(() => prewarmOverlay(), { timeout: 800 });
			} else {
				window.setTimeout(prewarmOverlay, 0);
			}
		} catch {}
	})();

	// On the AI Universe page: play the same Matrix headline morph on load.
	(function initAiUniverseHeadlineMatrix() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/ai-universe.html') && !path.endsWith('ai-universe.html')) return;
		} catch {
			return;
		}

		// If this page is loaded as a hidden "measure" iframe, report the headline position and stop.
		try {
			const qs = new URLSearchParams(window.location.search || '');
			if (qs.get('measure') === '1') {
				const send = () => {
					try {
						window.scrollTo(0, 0);
						const h1 = document.getElementById('ai-universe-headline') || document.querySelector('.ai-universe-page h1');
						if (!h1) return;
						// Measure using the SAME visual style as the final matrix headline.
						try { h1.classList.add('matrix-headline'); } catch {}
						// Ensure identical glyph spacing (per-letter spans) for measurement too.
						try { renderMatrixHeadline(h1, h1.textContent); } catch {}
						const r = getMatrixTextBounds(h1) || h1.getBoundingClientRect();
						window.parent && window.parent.postMessage({
							__msk: 'ai_universe_measure',
							rect: { x: r.x, y: r.y, w: r.w ?? r.width, h: r.h ?? r.height },
							vw: window.innerWidth,
							vh: window.innerHeight
						}, '*');
					} catch {}
				};
				// Respond on load, and also when the parent explicitly requests a measurement.
				try {
					window.addEventListener('message', (e) => {
						const d = e && e.data;
						if (!d || typeof d !== 'object') return;
						if (d.__msk !== 'ai_universe_measure_req') return;
						requestAnimationFrame(() => requestAnimationFrame(send));
					});
				} catch {}
				requestAnimationFrame(() => requestAnimationFrame(send));
				return;
			}
		} catch {}

		// IMPORTANT: if this is a preview/measure iframe, do not run enter/morph logic.
		// Previews are used inside transition overlays and should stay static.
		try {
			const qs = new URLSearchParams(window.location.search || '');
			if (qs.get('preview') === '1') return;
		} catch {}

		let target = null;
		try { target = window.sessionStorage.getItem('ai_universe_matrix_headline'); } catch {}
		if (!target) return;

		let alreadyAligned = false;
		try { alreadyAligned = window.sessionStorage.getItem('ai_universe_aligned') === '1'; } catch {}

		// Mark aligned state so CSS can keep content stable.
		if (alreadyAligned) {
			try { document.body.classList.add('ai-aligned'); } catch {}
		}

		// Smooth background enter only when coming from the book transition.
		try {
			// If headline is already aligned, keep the headline/content stable (no slide-in).
			if (!alreadyAligned && window.sessionStorage.getItem('ai_universe_enter') === '1') {
				document.body.classList.add('ai-enter');
				requestAnimationFrame(() => document.body.classList.add('ai-enter-active'));
				window.setTimeout(() => {
					try { document.body.classList.remove('ai-enter', 'ai-enter-active'); } catch {}
				}, 1400);
			}
		} catch {}

		const h1 = document.getElementById('ai-universe-headline') || document.querySelector('.ai-universe-page h1');
		if (!h1) return;

		// If the transition already moved the title into the correct position,
		// keep the headline stable (no extra motion/morph).
		if (alreadyAligned) {
			h1.classList.add('matrix-headline');
			renderMatrixHeadline(h1, target);
			try {
				window.sessionStorage.removeItem('ai_universe_matrix_headline');
				window.sessionStorage.removeItem('ai_universe_matrix_ts');
				window.sessionStorage.removeItem('ai_universe_enter');
				window.sessionStorage.removeItem('ai_universe_aligned');
			} catch {}
			return;
		}

		// Animate headline from the book-title position into the box position.
		try {
			const raw = window.sessionStorage.getItem('ai_universe_from_rect');
			if (raw) {
				window.sessionStorage.removeItem('ai_universe_from_rect');
				const from = JSON.parse(raw);
				// Only if viewport seems unchanged.
				if (from && Math.abs((from.vw || 0) - window.innerWidth) < 3 && Math.abs((from.vh || 0) - window.innerHeight) < 3) {
					window.scrollTo(0, 0);
					// Wait for layout (2 frames).
					requestAnimationFrame(() => {
						requestAnimationFrame(() => {
							const end = h1.getBoundingClientRect();
							const fromCx = (from.x + from.w / 2);
							const fromCy = (from.y + from.h / 2);
							const endCx = (end.x + end.width / 2);
							const endCy = (end.y + end.height / 2);
							const dx = fromCx - endCx;
							const dy = fromCy - endCy;
							const s = Math.max(0.6, Math.min(1.8, (from.w / Math.max(1, end.width))));
							h1.style.willChange = 'transform';
							h1.style.transformOrigin = 'center';
							h1.style.transition = 'transform 1050ms cubic-bezier(.2,.9,.2,1)';
							h1.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
							requestAnimationFrame(() => {
								h1.style.transform = 'translate(0px, 0px) scale(1)';
							});
						});
					});
				}
			}
		} catch {}

		// Clear flag so it only runs once.
		try {
			window.sessionStorage.removeItem('ai_universe_matrix_headline');
			window.sessionStorage.removeItem('ai_universe_matrix_ts');
			window.sessionStorage.removeItem('ai_universe_enter');
			window.sessionStorage.removeItem('ai_universe_aligned');
		} catch {}

		h1.classList.add('matrix-headline');
		// Start from "noise" so it feels like a continuation.
		h1.textContent = String(target).replace(/[^\s]/g, '0');
		// One letter at a time.
		matrixMorphText(h1, target, {
			stepMs: 62,
			easeInOut: true,
			flickerSteps: 3,
			flickerMs: 16,
			charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
			lockedClass: 'matrix-char',
			orderMode: 'random',
			dropClass: 'matrix-drop'
		});
	})();

	// Kontakt -> Projekter: flip TWO pages fast (hint of "Om mig" in-between),
	// but this time it's the LEFT page that flips to the RIGHT.
	(function initContactToProjectsDoubleFlip() {
		try {
			const path = (window.location.pathname || '').toLowerCase();
			if (!path.endsWith('/contact.html') && !path.endsWith('contact.html')) return;
		} catch {
			return;
		}

		const NAV_MS = 140;

		function ensureOverlay() {
			let overlay = document.querySelector('.contact-projects-transition');
			if (!overlay) {
				overlay = document.createElement('div');
				overlay.className = 'contact-projects-transition cp-stage-contact';
				overlay.innerHTML = `
					<div class="cp-turn" aria-hidden="true">
						<div class="cp-under cp-under--left">
							<iframe class="cp-frame cp-frame--left cp-under-frame cp-under-frame--contact" src="contact.html?preview=1" title="Kontakt (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--left cp-under-frame cp-under-frame--about" src="about.html?preview=1" title="Om mig (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--left cp-under-frame cp-under-frame--projects" src="projects.html?preview=1" title="Projekter (left)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>
						<div class="cp-under cp-under--right">
							<iframe class="cp-frame cp-frame--right cp-under-frame cp-under-frame--contact" src="contact.html?preview=1" title="Kontakt (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--right cp-under-frame cp-under-frame--about" src="about.html?preview=1" title="Om mig (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							<iframe class="cp-frame cp-frame--right cp-under-frame cp-under-frame--projects" src="projects.html?preview=1" title="Projekter (right)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
						</div>

						<!-- Flip 1: Contact -> About (left page flips right)
						     Turning sheet shows Kontakt LEFT until seam, then Om mig RIGHT (CV/udmærkelser). -->
						<div class="cp-flip cp-flip--one">
							<div class="cp-flip__content cp-flip__content--normal" aria-hidden="true">
								<iframe class="cp-frame cp-frame--left cp-flip-frame cp-flip1-front--contact" src="contact.html?preview=1" title="Kontakt (left on turning sheet, before seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="cp-flip__content cp-flip__content--mirrored" aria-hidden="true">
								<iframe class="cp-frame cp-frame--right cp-flip-frame cp-flip1-back--about" src="about.html?preview=1" title="Om mig (right on turning sheet, after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>

						<!-- Flip 2: About -> Projects (left page flips right)
						     Turning sheet shows Om mig LEFT until seam, then Projekter RIGHT. -->
						<div class="cp-flip cp-flip--two">
							<div class="cp-flip__content cp-flip__content--normal" aria-hidden="true">
								<iframe class="cp-frame cp-frame--left cp-flip-frame cp-flip2-front--about" src="about.html?preview=1" title="Om mig (left on turning sheet, before seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
							<div class="cp-flip__content cp-flip__content--mirrored" aria-hidden="true">
								<iframe class="cp-frame cp-frame--right cp-flip-frame cp-flip2-back--projects" src="projects.html?preview=1" title="Projekter (right on turning sheet, after seam)" loading="eager" referrerpolicy="no-referrer" tabindex="-1"></iframe>
							</div>
						</div>
					</div>
				`;
				document.body.appendChild(overlay);
			}
			return overlay;
		}

		function startDoubleFlipToProjects(targetHref) {
			const body = document.body;
			if (body.classList.contains('cp-flipping') || document.querySelector('.contact-projects-transition')) return;

			try {
				const old = document.querySelector('.contact-projects-transition');
				if (old) old.remove();
			} catch {}

			const overlay = ensureOverlay();
			const FLIP_MS = getCssVarMsFromEl(overlay, '--pageFlipMs', 1200);
			const FLIP2_START_MS = Math.round(FLIP_MS * 0.62); // overlap

			function scheduleAtAngle(flipEl, triggerDeg, fn, fallbackMs) {
				let done = false;
				function fire() {
					if (done) return;
					done = true;
					try { fn(); } catch {}
				}
				// Angle-based detection (0 -> 180, seam at 90)
				function tick(startAt) {
					if (done) return;
					try {
						const ang = angleDegFromMatrix3d(window.getComputedStyle(flipEl).transform);
						if (typeof ang === 'number' && ang >= triggerDeg) {
							fire();
							return;
						}
					} catch {}
					const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					if ((now - startAt) >= fallbackMs) {
						fire();
						return;
					}
					requestAnimationFrame(() => tick(startAt));
				}
				function startWatcher() {
					const startAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
					requestAnimationFrame(() => tick(startAt));
				}
				// Anchor watcher close to animation start.
				try {
					let started = false;
					flipEl.addEventListener('animationstart', () => {
						if (started) return;
						started = true;
						startWatcher();
					}, { once: true });
					// Fallback in case animationstart doesn't fire (rare)
					window.setTimeout(() => {
						if (started) return;
						started = true;
						startWatcher();
					}, 0);
				} catch {
					window.setTimeout(fire, fallbackMs);
				}
			}

			// Avoid any iframe "wrong page" flash: only show frames after load.
			try {
				const frames = Array.from(overlay.querySelectorAll('iframe'));
				frames.forEach((fr) => {
					fr.classList.remove('is-loaded');
					fr.addEventListener('load', () => fr.classList.add('is-loaded'), { once: true });
				});
			} catch {}
			overlay.classList.remove(
				'is-ready',
				'turning1',
				'turning2',
				'cp-swap1-mid',
				'cp-swap2-mid',
				'swap-left-to-about',
				'swap-right-to-about',
				'swap-left-to-projects',
				'swap-right-to-projects',
				'cp-stage-contact',
				'cp-stage-about',
				'cp-stage-projects'
			);
			overlay.classList.add('cp-stage-contact');

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					overlay.classList.add('is-ready');
					body.classList.add('contact-projects-flip-active');
					body.classList.add('cp-flipping');
					body.style.overflow = 'hidden';

							// Trigger slightly BEFORE the visual seam so the design switches earlier.
							const SWAP_DEG = 75;

					// Flip 1 (Contact -> About)
					requestAnimationFrame(() => overlay.classList.add('turning1'));
					// Left side is covered immediately by the turning sheet.
					// Left page lifts immediately -> swap under-left immediately (no flash)
					overlay.classList.add('swap-left-to-about');
					// Switch the right side + turning sheet design at the true visual seam.
					try {
						const flip1 = overlay.querySelector('.cp-flip--one');
						if (flip1) {
									const fb = Math.round(FLIP_MS * 0.5) + 40;
									scheduleAtAngle(flip1, SWAP_DEG, () => overlay.classList.add('swap-right-to-about'), fb);
									scheduleAtAngle(flip1, SWAP_DEG, () => overlay.classList.add('cp-swap1-mid'), fb);
						} else {
							window.setTimeout(() => overlay.classList.add('swap-right-to-about'), Math.round(FLIP_MS * 0.5));
							window.setTimeout(() => overlay.classList.add('cp-swap1-mid'), Math.round(FLIP_MS * 0.5));
						}
					} catch {
						window.setTimeout(() => overlay.classList.add('swap-right-to-about'), Math.round(FLIP_MS * 0.5));
						window.setTimeout(() => overlay.classList.add('cp-swap1-mid'), Math.round(FLIP_MS * 0.5));
					}
					// Stage change slightly after seam.
					window.setTimeout(() => {
						overlay.classList.remove('cp-stage-contact');
						overlay.classList.add('cp-stage-about');
					}, Math.round(FLIP_MS * 0.52));
					// Cleanup flip1 toggles when done.
					window.setTimeout(() => {
						overlay.classList.remove('turning1', 'swap-left-to-about', 'swap-right-to-about', 'cp-swap1-mid');
					}, FLIP_MS);

					// Flip 2 (About -> Projects) starts before flip 1 finishes.
					window.setTimeout(() => {
						overlay.classList.add('turning2');
						// Left page lifts immediately -> swap under-left immediately (no flash)
						overlay.classList.add('swap-left-to-projects');
						try {
							const flip2 = overlay.querySelector('.cp-flip--two');
							if (flip2) {
								const fb = Math.round(FLIP_MS * 0.5) + 40;
										scheduleAtAngle(flip2, SWAP_DEG, () => overlay.classList.add('swap-right-to-projects'), fb);
										scheduleAtAngle(flip2, SWAP_DEG, () => overlay.classList.add('cp-swap2-mid'), fb);
							} else {
								window.setTimeout(() => overlay.classList.add('swap-right-to-projects'), Math.round(FLIP_MS * 0.5));
								window.setTimeout(() => overlay.classList.add('cp-swap2-mid'), Math.round(FLIP_MS * 0.5));
							}
						} catch {
							window.setTimeout(() => overlay.classList.add('swap-right-to-projects'), Math.round(FLIP_MS * 0.5));
							window.setTimeout(() => overlay.classList.add('cp-swap2-mid'), Math.round(FLIP_MS * 0.5));
						}
					}, FLIP2_START_MS);

					window.setTimeout(() => {
						overlay.classList.remove('turning2', 'swap-left-to-projects', 'swap-right-to-projects', 'cp-swap2-mid');
						overlay.classList.remove('cp-stage-about');
						overlay.classList.add('cp-stage-projects');
					}, FLIP2_START_MS + FLIP_MS);

					window.setTimeout(() => {
						window.location.href = targetHref;
					}, FLIP2_START_MS + FLIP_MS + NAV_MS);
				});
			});
		}

		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'projects.html') return;
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			// Prevent other "to projects" transitions from also running.
			try { e.stopImmediatePropagation(); } catch {}
			startDoubleFlipToProjects(a.href);
		}, true);
	})();

	// Right-edge navigation (since navbar is currently hidden)
	(function initEdgeNav() {
		// Top navbar is now always visible; do not mount edge-nav.
		try {
			if (document.documentElement && document.documentElement.classList.contains('transition-preview')) return;
			const topNav = document.querySelector('.navbar');
			if (topNav && window.getComputedStyle && window.getComputedStyle(topNav).display !== 'none') return;
		} catch {}

		const existing = document.querySelector('.edge-nav');
		if (existing) return;

		const nav = document.createElement('div');
		nav.className = 'edge-nav';
		nav.setAttribute('aria-label', 'Side navigation');

		const handle = document.createElement('div');
		handle.className = 'edge-nav__handle';
		handle.setAttribute('aria-hidden', 'true');

		const panel = document.createElement('div');
		panel.className = 'edge-nav__panel';

		const title = document.createElement('div');
		title.className = 'edge-nav__title';
		title.textContent = 'Menu';

		const links = [
			{ href: 'index.html', text: 'HJEM' },
			{ href: 'projects.html', text: 'PROJEKTER' },
			{ href: 'about.html', text: 'OM MIG' },
			{ href: 'about.html#cv', text: 'CV' },
			{ href: 'about.html#udmaerkelser', text: 'UDMÆRKELSER' },
			{ href: 'contact.html', text: 'KONTAKT' },
			{ href: 'ai-universe.html', text: 'MIN AI UNIVERS' },
		];

		panel.appendChild(title);
		links.forEach(({ href, text }) => {
			const a = document.createElement('a');
			a.className = 'edge-nav__link';
			a.href = href;
			a.textContent = text;
			panel.appendChild(a);
		});

		nav.appendChild(handle);
		nav.appendChild(panel);
		document.body.appendChild(nav);

		const OPEN_PX = 10; // distance from right edge
		let open = false;
		let closeTimer = null;

		function setOpen(next) {
			if (open === next) return;
			open = next;
			nav.classList.toggle('is-open', open);
		}

		function scheduleClose() {
			if (closeTimer) window.clearTimeout(closeTimer);
			closeTimer = window.setTimeout(() => setOpen(false), 220);
		}

		window.addEventListener('mousemove', (e) => {
			// Don't show during book animation; CSS also hides, this is extra safety.
			if (document.body.classList.contains('home-opening-projects') ||
				document.body.classList.contains('home-opening-layout') ||
				document.body.classList.contains('home-opened-projects') ||
				document.body.classList.contains('home-shift-projects')) {
				setOpen(false);
				return;
			}
			const dist = window.innerWidth - e.clientX;
			if (dist <= OPEN_PX) {
				if (closeTimer) window.clearTimeout(closeTimer);
				setOpen(true);
			} else if (open) {
				scheduleClose();
			}
		});

		nav.addEventListener('mouseenter', () => {
			if (closeTimer) window.clearTimeout(closeTimer);
			setOpen(true);
		});
		nav.addEventListener('mouseleave', () => scheduleClose());

		// Keyboard accessibility: open when focused inside.
		nav.addEventListener('focusin', () => setOpen(true));
		nav.addEventListener('focusout', (e) => {
			if (!nav.contains(e.relatedTarget)) scheduleClose();
		});
	})();

	// Projects book-flip transition (works from ALL pages).
	(function initProjectsFlipTransition() {
		const body = document.body;
		if (!body) return;

		function ensureTransitionNotebook() {
			// If we're already on the frontpage, the notebook markup exists.
			let notebook = document.querySelector('main.home-notebook');

			// Otherwise, create a fixed overlay notebook just for the transition.
			let overlay = document.querySelector('.projects-transition');
			if (!notebook) {
				if (!overlay) {
					overlay = document.createElement('div');
					overlay.className = 'projects-transition';
					overlay.innerHTML = `
						<main class="home-notebook" role="main" aria-label="Projekter transition">
							<div class="home-notebook__pages" aria-hidden="true"></div>
							<div class="home-notebook__cover" aria-hidden="true">
								<div class="home-notebook__cover-back" aria-hidden="true"></div>
							</div>
							<div class="home-notebook__leaf-fan" aria-hidden="true"></div>
							<div class="home-notebook__spread" aria-hidden="true">
								<iframe
									class="home-notebook__projekter-full"
									src="projects.html"
									title="Projekter preview"
									loading="eager"
									referrerpolicy="no-referrer"
									tabindex="-1"
								></iframe>
							</div>
							<h1 class="home-notebook__title" data-text="Mikkels notesbog">Mikkels notesbog</h1>
						</main>
					`;
					document.body.appendChild(overlay);
				}
				notebook = overlay.querySelector('main.home-notebook');
			}

			// Turn on the home-notebook transition styling even on subpages.
			body.classList.add('home-notebook-page');
			body.classList.add('projects-transition-active');

			const rightFrame = notebook.querySelector('.home-notebook__projekter-full');
			const cover = notebook.querySelector('.home-notebook__cover');
			let leftFrame = notebook.querySelector('.home-notebook__projekter-left');
			if (cover && !leftFrame) {
				leftFrame = document.createElement('iframe');
				leftFrame.className = 'home-notebook__projekter-left';
				leftFrame.src = 'projects.html';
				leftFrame.title = 'Projekter preview (left)';
				leftFrame.loading = 'eager';
				leftFrame.referrerPolicy = 'no-referrer';
				leftFrame.tabIndex = -1;
				cover.appendChild(leftFrame);
			}

			return { notebook, overlay, rightFrame, leftFrame };
		}

		function injectHomePreviewCSS(doc) {
			if (!doc || !doc.head) return;
			let style = doc.getElementById('home-preview-style');
			if (!style) {
				style = doc.createElement('style');
				style.id = 'home-preview-style';
				doc.head.appendChild(style);
			}
			style.textContent = `
				html.home-preview,
				html.home-preview body {
					margin: 0 !important;
					overflow: hidden !important;
				}
			`;
		}

		function prepOneFrame(fr) {
			try {
				if (!fr || !fr.contentDocument) return false;
				const doc = fr.contentDocument;
				doc.documentElement.classList.add('home-preview');
				doc.documentElement.classList.add('home-preview-reveal');
				injectHomePreviewCSS(doc);
				fr.dataset.homePreviewReady = '1';
				return true;
			} catch {
				return false;
			}
		}

		function startProjectsTransition(targetHref) {
			// Avoid re-entry.
			if (body.classList.contains('home-opening-projects') || body.classList.contains('home-shift-projects')) return;

			const { rightFrame, leftFrame } = ensureTransitionNotebook();

			// Prep iframes (no flash).
			[rightFrame, leftFrame].filter(Boolean).forEach((fr) => {
				if (!fr) return;
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});

			// Reset later-phase classes.
			body.classList.remove('home-zoom-projects');
			body.classList.remove('home-opened-projects');
			body.classList.remove('home-opening-projects');
			body.classList.remove('home-opening-layout');
			body.classList.remove('home-opening-center');
			body.classList.remove('home-reveal-projects');

			// Phase 0: shift the closed book right so the spine sits at screen middle.
			body.classList.add('home-shift-projects');
			body.classList.add('home-reveal-projects');

			// Phase 1: open from the center seam.
			window.setTimeout(() => {
				body.style.setProperty('--precenterShiftX', `0px`);
				body.classList.add('home-opening-layout');
				requestAnimationFrame(() => {
					body.classList.add('home-opening-projects');
					body.classList.remove('home-opening-layout');
				});
			}, 900);

			// Phase 2: once opened, show the full connected spread (two pages).
			window.setTimeout(() => {
				body.classList.add('home-opened-projects');
				body.classList.remove('home-opening-center');
				body.classList.remove('home-shift-projects');
				body.style.removeProperty('--precenterShiftX');
			}, 900 + 3200);

			// Navigate right after the open settles.
			window.setTimeout(() => {
				window.location.href = targetHref;
			}, 900 + 3200 + 140);
		}

		// Delegate clicks so dynamically created edge-nav links also work.
		document.addEventListener('click', (e) => {
			const a = e.target && e.target.closest ? e.target.closest('a') : null;
			if (!a) return;
			const hrefAttr = (a.getAttribute('href') || '').trim();
			if (hrefAttr !== 'projects.html') return;

			// Let the custom "Om mig -> Projekter" left-page flip handle this.
			try {
				const path = (window.location.pathname || '').toLowerCase();
				if (path.endsWith('/about.html') || path.endsWith('about.html')) return;
			} catch {}

			// If already on projects, allow default.
			if ((window.location.pathname || '').toLowerCase().endsWith('/projects.html')) return;

			// Allow normal browser behaviors (new tab, etc.)
			if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			e.preventDefault();
			startProjectsTransition(a.href);
		}, true);

		// If we're on the frontpage, prep the preview immediately.
		if (body.classList.contains('home-notebook-page')) {
			const { rightFrame, leftFrame } = ensureTransitionNotebook();
			[rightFrame, leftFrame].filter(Boolean).forEach((fr) => {
				if (!fr) return;
				if (!prepOneFrame(fr)) fr.addEventListener('load', () => prepOneFrame(fr), { once: true });
			});
		}
	})();

	// Brain animations and connecting lines
	function initBrainAnimations() {
		const isPreview = document.documentElement.classList.contains('transition-preview');
		const brain = document.querySelector('.brain');
		const nodes = document.querySelectorAll('.project-node');
		const pupils = document.querySelectorAll('.pupil');
		const mouth = document.querySelector('.brain-mouth');
		const svg = document.querySelector('.connecting-lines');
		const fartLayer = document.querySelector('.fart-layer');
		
		console.log('Initializing brain animations...');
		console.log('Found nodes:', nodes.length);
		console.log('Node elements:', nodes);
		
		if (!brain || !nodes.length) {
			console.log('Missing brain or nodes. Brain:', brain, 'Nodes count:', nodes.length);
			// When navigating to "projekter", the section may appear after initial load.
			// Retry a few times so the assets/lines (incl. arrows) don't "disappear".
			const tries = Number(document.documentElement.dataset.brainInitTries || '0');
			if (tries < 10) {
				document.documentElement.dataset.brainInitTries = String(tries + 1);
				window.setTimeout(initBrainAnimations, 200);
			}
			return;
		}

		// If we've already bound listeners once, just re-position/redraw.
		if (brain.dataset.animInit === '1') {
			try {
				// Refresh pass to ensure custom assets are present after navigation.
				positionNodesPerfectCircle();
				createAndPositionDandDLogo();
				createAndPositionTwisterDandDLine();
				createAndPositionRepopKravlingLine();
				createAndPositionKravlingNomineretBadge();
				createAndPositionKobajerArrow();
				createConnectingLines();
				createHandDrawnFrames();
			} catch {}
			if (isPreview) {
				try {
					const container = document.querySelector('.brainstorm-container');
					if (container) container.classList.add('preview-ready');
				} catch {}
			}
			return;
		}

		// Position all project nodes in a perfect circle around the brain.
		// This overrides the hand-tuned % positions in the HTML so everything is evenly spaced.
		function positionNodesPerfectCircle() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;

			const containerRect = container.getBoundingClientRect();
			const brainRect = brain.getBoundingClientRect();
			const centerX = brainRect.left - containerRect.left + brainRect.width / 2;
			const centerY = brainRect.top - containerRect.top + brainRect.height / 2;

			// Use an ellipse ring (rx > ry) to fill more horizontal space without pushing tabs off-screen vertically.
			const paddingX = 210; // keep horizontal size
			const paddingY = 215; // base vertical padding
			const rx = Math.max(200, (containerRect.width / 2) - paddingX);
			let ry = Math.max(170, (containerRect.height / 2) - paddingY);
			// Make it bigger VERTICALLY only (do not change rx)
			ry = ry + 120;

			const nodeArray = Array.from(nodes);
			const n = nodeArray.length || 1;
			// Start at top (-90deg) and go clockwise.
			const startAngle = -Math.PI / 2;
			const step = (Math.PI * 2) / n;

			// Preserve the existing "sketchy tilt" vibe without affecting positioning.
			const tilts = [-1, 1, -2, 0.5, -1.5, 2, -0.5, 1.5];

			// Anchor each tab by its CENTER so varying text widths/heights don't break the circle.
			nodeArray.forEach((node, i) => {
				const angle = startAngle + i * step;
				const x = centerX + rx * Math.cos(angle);
				let y = centerY + ry * Math.sin(angle);
				const href = (node.getAttribute('href') || '').toLowerCase();

				// Move REPOP + its connected assets (circle/arrow/badges) down one ruled line.
				// (Those assets are positioned from the node's on-screen rect, so this shifts all of it.)
				if (href.includes('repop')) y += 35;

				node.style.setProperty('position', 'absolute', 'important');
				node.style.setProperty('left', `${x}px`, 'important');
				node.style.setProperty('top', `${y}px`, 'important');
				node.style.setProperty('right', 'auto', 'important');
				node.style.setProperty('bottom', 'auto', 'important');
				node.style.setProperty('margin-left', '0', 'important');
				node.style.setProperty('margin-top', '0', 'important');

				// Center + tilt.
				node.style.setProperty(
					'transform',
					`translate(-50%, -50%) rotate(${tilts[i] ?? 0}deg)`,
					'important'
				);

				// Move ONLY the word (label) for BRAINFARTS a bit to the right.
				if (href.includes('brainfarts')) {
					let label = node.querySelector('.node-label');
					if (!label) {
						label = document.createElement('span');
						label.className = 'node-label';
						label.textContent = node.textContent;
						node.textContent = '';
						node.appendChild(label);
					}
					label.style.display = 'inline-block';
					label.style.transform = 'translateX(3px)';
				}
			});

			// Keep the D&AD logo aligned after node layout updates
			createAndPositionDandDLogo();
			createAndPositionTwisterDandDLine();
			createAndPositionRepopKravlingLine();
			createAndPositionKravlingNomineretBadge();
			createAndPositionKobajerArrow();
		}

		// Create fart clouds
		function createFartClouds() {
			if (!fartLayer) return;
			
				const cloud = document.createElement('div');
				cloud.className = 'fart-cloud';

			// Spawn from the brain "butt" area: slightly under/right inside fartLayer
			const size = 18 + Math.random() * 18; // 18-36px (bigger)
			const left = 58 + Math.random() * 14; // %
			const top = 50 + Math.random() * 14;  // % (start higher)

			// Move UP only
			const dy = -(80 + Math.random() * 90);
			const scale = 1.2 + Math.random() * 1.0;
			const dur = 0.9 + Math.random() * 0.8;

			cloud.style.left = `${left}%`;
			cloud.style.top = `${top}%`;
			cloud.style.width = `${size}px`;
			cloud.style.height = `${size}px`;
			cloud.style.setProperty('--dy', `${dy}px`);
			cloud.style.setProperty('--scale', String(scale));
			cloud.style.setProperty('--dur', `${dur}s`);

			// Slight color variety
			if (Math.random() < 0.33) cloud.classList.add('light');
			if (Math.random() < 0.33) cloud.classList.add('dark');

				fartLayer.appendChild(cloud);
			window.setTimeout(() => cloud.remove(), (dur * 1000) + 250);
		}

		// Brain blush (cheeks) - small red dot patches on the brain itself
		function createBrainBlush() {
			if (!brain) return;
			// Avoid duplicates
			if (brain.querySelector('.brain-blush')) return;

			const left = document.createElement('div');
			left.className = 'brain-blush left';
			const right = document.createElement('div');
			right.className = 'brain-blush right';

			brain.appendChild(left);
			brain.appendChild(right);
		}

		// Place D&AD logo to the right of TWISTER tab (projects page)
		function createAndPositionDandDLogo() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			const twisterNode = Array.from(nodes).find(n => (n.getAttribute('href') || '').toLowerCase().includes('twister'));
			if (!twisterNode) return;

			function fillShineRays(sparksEl, count = 14) {
				// Replace with many rays (more intense shine)
				sparksEl.innerHTML = '';
				// Full 360° ring of rays around the set
				const start = -180;
				const step = 360 / Math.max(1, count); // avoid duplicating -180/180
				for (let i = 0; i < count; i++) {
					const s = document.createElement('span');
					s.className = 'spark';
					const rot = start + (step * i);
					const delay = (i % 10) * 0.06;
					const w = (i % 3 === 0) ? 4 : 3;
					// Perfect round ring: ALL rays start from the same radius.
					const r = 56;
					let h = 78;
					// Every second ray is half as long (but starts at the same ring)
					if (i % 2 === 1) h = Math.round(h * 0.5);
					s.style.setProperty('--rot', `${rot}deg`);
					s.style.setProperty('--d', `${delay}s`);
					s.style.setProperty('--w', `${w}px`);
					s.style.setProperty('--r', `${r}px`);
					s.style.setProperty('--h', `${h}px`);
					sparksEl.appendChild(s);
				}
			}

			let badge = container.querySelector('.dandd-badge');
			if (!badge) {
				badge = document.createElement('div');
				badge.className = 'dandd-badge';

				const logo = document.createElement('img');
				logo.className = 'dandd-logo';
				logo.alt = "D&AD";
				// Always ensure we use the newest logo file (fallback to the alternative filename if needed)
				logo.src = "assets/D&AD LOGO.webp";
				logo.onerror = () => {
					logo.onerror = null;
					logo.src = "assets/D&AD logo.webp";
				};

				const winner = document.createElement('img');
				winner.className = 'dandd-winner';
				winner.alt = 'D&AD VINDER';
				winner.src = 'assets/D&AD VINDER.webp';

				const sparks = document.createElement('div');
				sparks.className = 'dandd-sparks';
				fillShineRays(sparks, 14);

				badge.appendChild(logo);
				badge.appendChild(sparks);
				badge.appendChild(winner);
				container.appendChild(badge);
			} else {
				// Keep logo source up to date if assets were swapped
				const logo = badge.querySelector('.dandd-logo');
				if (logo) {
					logo.src = "assets/D&AD LOGO.webp";
					logo.onerror = () => {
						logo.onerror = null;
						logo.src = "assets/D&AD logo.webp";
					};
				}
				// Ensure sparks layer exists
				let sparks = badge.querySelector('.dandd-sparks');
				if (!sparks) {
					sparks = document.createElement('div');
					sparks.className = 'dandd-sparks';
					const logoEl = badge.querySelector('.dandd-logo');
					if (logoEl && logoEl.nextSibling) badge.insertBefore(sparks, logoEl.nextSibling);
					else badge.appendChild(sparks);
				}
				// Always rebuild to match "more rays"
				fillShineRays(sparks, 14);
				// Replace old text (if present) with the winner asset
				badge.querySelectorAll('.dandd-text').forEach(el => el.remove());
				let winner = badge.querySelector('.dandd-winner');
				if (!winner) {
					winner = document.createElement('img');
					winner.className = 'dandd-winner';
					winner.alt = 'D&AD VINDER';
					badge.appendChild(winner);
				}
				winner.src = 'assets/D&AD VINDER.webp';
			}

			const containerRect = container.getBoundingClientRect();
			const r = twisterNode.getBoundingClientRect();
			const top = (r.top - containerRect.top) + (r.height / 2) + 28; // move more down
			const left = (r.right - containerRect.left) + 14 + 70; // move a lot more right

			badge.style.left = `${left}px`;
			badge.style.top = `${top}px`;
			badge.style.transform = 'translateY(-50%) rotate(-2deg)';
		}

		// Charcoal rays (like TWISTER rays, but dark pencil/charcoal vibe)
		function fillCharcoalRays(sparksEl, count = 14, opts = {}) {
			if (!sparksEl) return;
			sparksEl.innerHTML = '';
			const ringR = Number.isFinite(opts.r) ? opts.r : 48;
			const baseH = Number.isFinite(opts.h) ? opts.h : 72;
			const start = -180;
			const step = 360 / Math.max(1, count);
			for (let i = 0; i < count; i++) {
				const s = document.createElement('span');
				s.className = 'spark';
				const rot = start + (step * i);
				const delay = (i % 10) * 0.06;
				const w = (i % 3 === 0) ? 4 : 3;
				const r = ringR;
				let h = baseH;
				if (i % 2 === 1) h = Math.round(h * 0.5);
				s.style.setProperty('--rot', `${rot}deg`);
				s.style.setProperty('--d', `${delay}s`);
				s.style.setProperty('--w', `${w}px`);
				s.style.setProperty('--r', `${r}px`);
				s.style.setProperty('--h', `${h}px`);
				sparksEl.appendChild(s);
			}
		}

		// Place the line asset between TWISTER and the D&AD badge (more reliable than SVG <image>)
		function createAndPositionTwisterDandDLine() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			const twisterNode = Array.from(nodes).find(n => (n.getAttribute('href') || '').toLowerCase().includes('twister'));
			const badge = container.querySelector('.dandd-badge');
			if (!twisterNode || !badge) return;

			let line = container.querySelector('.twister-dandd-line');
			if (!line) {
				line = document.createElement('img');
				line.className = 'twister-dandd-line';
				line.alt = '';
				line.src = encodeURI("assets/linje mellem  twister og  D&AD.webp");
				line.style.position = 'absolute';
				line.style.pointerEvents = 'none';
				line.style.zIndex = '12';
				line.style.display = 'block';
				line.style.imageRendering = 'crisp-edges';
				line.style.filter = 'none';
				container.appendChild(line);
			}

			const containerRect = container.getBoundingClientRect();
			const twRect = twisterNode.getBoundingClientRect();
			const badgeRect = badge.getBoundingClientRect();

			// Start at TWISTER right-middle, end at badge left-middle
			const startX = (twRect.right - containerRect.left);
			const startY = (twRect.top - containerRect.top) + (twRect.height / 2);
			const endX = (badgeRect.left - containerRect.left);
			const endY = (badgeRect.top - containerRect.top) + (badgeRect.height / 2);

			const dx = endX - startX;
			const dy = endY - startY;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;

			// Make it longer: extend slightly into both ends
			const gapStart = -28;
			const gapEnd = -28;
			const sX = startX + (dx / dist) * gapStart;
			const sY = startY + (dy / dist) * gapStart;
			const eX = endX - (dx / dist) * gapEnd;
			const eY = endY - (dy / dist) * gapEnd;

			const angle = (Math.atan2(eY - sY, eX - sX) * 180 / Math.PI) + 6; // rotate a bit more down
			const lineLength = Math.sqrt((eX - sX) ** 2 + (eY - sY) ** 2);

			line.style.left = `${sX}px`;
			line.style.top = `${sY}px`;
			line.style.width = `${lineLength}px`;
			line.style.height = '190px'; // thicker
			line.style.transformOrigin = '0 50%';
			line.style.transform = `translateY(-50%) rotate(${angle}deg)`;
		}

		// Place mirrored line asset on the LEFT side of REPOP BY DEPOP
		function createAndPositionRepopKravlingLine() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			const repopNode = Array.from(nodes).find(n => (n.getAttribute('href') || '').toLowerCase().includes('repop'));
			if (!repopNode) return;

			let line = container.querySelector('.repop-kravling-line');
			if (!line) {
				line = document.createElement('img');
				line.className = 'repop-kravling-line';
				line.alt = '';
				line.src = `assets/${encodeURIComponent("linje fra repop til kravling.webp")}`;
				line.style.position = 'absolute';
				line.style.pointerEvents = 'none';
				line.style.zIndex = '12';
				line.style.display = 'block';
				line.style.imageRendering = 'crisp-edges';
				line.style.filter = 'none';
				container.appendChild(line);
			}

			const containerRect = container.getBoundingClientRect();
			const r = repopNode.getBoundingClientRect();

			// Size (can be tuned) — keep the right edge anchored to the tab
			const width = 170; // shorter
			const height = 80; // slimmer
			const gap = 10;

			const top = (r.top - containerRect.top) + (r.height / 2) + 12; // a bit more down
			const left = (r.left - containerRect.left) - width + gap + 8; // a bit to the right

			line.style.width = `${width}px`;
			line.style.height = `${height}px`;
			line.style.left = `${left}px`;
			line.style.top = `${top}px`;
			// Mirror it horizontally
			line.style.transformOrigin = '50% 50%';
			line.style.transform = 'translateY(-50%) scaleX(-1)';
		}

		// Kravlinprisen "stars" (small burst animation)
		function fillKravlingStars(sparksEl, count = 12) {
			if (!sparksEl) return;
			sparksEl.innerHTML = '';
			for (let i = 0; i < count; i++) {
				const star = document.createElement('img');
				star.className = 'kravling-star';
				star.alt = '';
				star.draggable = false;
				star.src = `assets/${encodeURIComponent("stjerne til animation.webp")}`;

				// Elliptical ring (wider horizontally)
				const theta = (i * (Math.PI * 2)) / count;
				const delay = (i * 0.06).toFixed(2);
				// Different rotations per star (deterministic jitter so it stays stable)
				const baseRot = (i * (360 / count)) + ((i % 2 === 0) ? 12 : -10);
				const jitter = (((i * 37) % 50) - 25); // -25..+24 deg
				const rot = baseRot + jitter;

				const rxBase = 88; // horizontal radius (wider)
				const ryBase = 42; // vertical radius (slightly bigger top+bottom)
				const radiusMult = (i % 2 === 0) ? 1 : 0.86; // alternate distance

				const x = Math.cos(theta) * rxBase * radiusMult;
				let y = Math.sin(theta) * ryBase * radiusMult;
				// Make the ellipse slightly bigger in the bottom half (extend downward only)
				if (y > 0) y *= 1.22;

				// Bigger stars (slightly bigger overall, and a touch bigger in the bottom half)
				let size = (i % 3 === 0) ? 28 : (i % 3 === 1) ? 26 : 27;
				if (y > 0) size += 2; // bottom half (downwards) a bit bigger

				// Half of them should be 2/3 size (every second star)
				if (i % 2 === 1) size = Math.round(size * (2 / 3));

				star.style.left = `calc(50% + ${x.toFixed(1)}px)`;
				star.style.top = `calc(50% + ${y.toFixed(1)}px)`;
				star.style.setProperty('--rot', `${rot}deg`);
				star.style.setProperty('--d', `${delay}s`);
				star.style.setProperty('--s', `${size}px`);

				sparksEl.appendChild(star);
			}
		}

		// Place "Kravlinprisen nomineret 2025" badge to the LEFT of the repop-arrow
		function createAndPositionKravlingNomineretBadge() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			const arrow = container.querySelector('.repop-kravling-line');
			if (!arrow) return;

			let badge = container.querySelector('.kravling-nomineret-badge');
			// If an old IMG exists, replace it with a text badge
			if (badge && badge.tagName && badge.tagName.toLowerCase() === 'img') {
				badge.remove();
				badge = null;
			}
			if (!badge) {
				badge = document.createElement('div');
				badge.className = 'kravling-nomineret-badge';
				badge.innerHTML = `
					<div class="kravling-line1">KRAVLINGPRISEN</div>
					<div class="kravling-line2">NOMINERET</div>
					<div class="kravling-line3">2025</div>
				`;
				container.appendChild(badge);
			}

			// Ensure stars layer exists (for hover over REPOP)
			let sparks = badge.querySelector('.kravling-sparks');
			if (!sparks) {
				sparks = document.createElement('div');
				sparks.className = 'kravling-sparks';
				badge.appendChild(sparks);
			}
			fillKravlingStars(sparks, 12);

			const containerRect = container.getBoundingClientRect();
			const a = arrow.getBoundingClientRect();

			const width = 160;
			const gap = 12;
			const left = (a.left - containerRect.left) - width - gap;
			const top = (a.top - containerRect.top) + (a.height / 2);

			badge.style.width = `${width}px`;
			badge.style.height = 'auto';
			badge.style.left = `${left}px`;
			badge.style.top = `${top}px`;
			badge.style.transform = 'translateY(-50%) translateX(62px) translateY(-12px) rotate(-2deg)'; // 2025 badge slightly left
		}

		// Place arrow asset just under KØ-BAJER
		function createAndPositionKobajerArrow() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;

			const kobajerNode = Array.from(nodes).find(n => {
				const href = (n.getAttribute('href') || '').toLowerCase();
				const text = (n.textContent || '').trim().toUpperCase();
				return href.includes('kobajer') || text.includes('KØ-BAJER');
			});
			if (!kobajerNode) return;

			let arrow = container.querySelector('.kobajer-arrow');
			if (!arrow) {
				arrow = document.createElement('img');
				arrow.className = 'kobajer-arrow';
				arrow.alt = '';
				arrow.draggable = false;
				arrow.style.position = 'absolute';
				arrow.style.pointerEvents = 'none';
				arrow.style.zIndex = '20';
				arrow.style.display = 'block';
				arrow.style.imageRendering = 'crisp-edges';
				arrow.style.filter = 'none';
				container.appendChild(arrow);
			}
			// Always use the latest arrow asset file
			arrow.src = `assets/${encodeURIComponent('pil til kø bajer.webp')}`;
			// When navigating/re-initializing, the arrow image may not have dimensions yet.
			// Re-position the 2024 badge once the arrow has loaded.
			if (arrow.dataset.kobajerArrowBound !== '1') {
				arrow.dataset.kobajerArrowBound = '1';
				arrow.addEventListener('load', () => {
					// Reset retry counter and re-place the label once dimensions are known
					arrow.dataset.kravling2024Tries = '0';
					createAndPositionKobajerKravling2024Label();
				});
			}

			const containerRect = container.getBoundingClientRect();
			const r = kobajerNode.getBoundingClientRect();

			const width = 85; // shorter
			const gap = -35; // move slightly down
			const left = (r.left - containerRect.left) + (r.width / 2) - (width / 2) - 42; // more to the right
			const top = (r.bottom - containerRect.top) + gap;

			arrow.style.setProperty('width', `${width}px`, 'important');
			arrow.style.setProperty('height', 'auto', 'important');
			arrow.style.setProperty('max-width', 'none', 'important');
			arrow.style.setProperty('max-height', 'none', 'important');
			arrow.style.setProperty('object-fit', 'contain', 'important');
			arrow.style.left = `${left}px`;
			arrow.style.top = `${top}px`;
			// Point down, and make it thicker without making it longer
			arrow.style.transformOrigin = '50% 50%';
			arrow.style.transform = 'rotate(115deg) scaleY(1.4)'; // rotate more to the right

			// Position the "Kravlingprisen nomineret 2024" label under the arrow tip
			createAndPositionKobajerKravling2024Label();

			// If the image is cached, 'load' may not fire after we attach listeners.
			// Ensure we attempt a position pass once the browser has a chance to compute layout.
			window.setTimeout(createAndPositionKobajerKravling2024Label, 0);
		}

		// Repeat "Kravlingprisen nomineret" with 2024 under the arrow point
		function createAndPositionKobajerKravling2024Label() {
			const container = document.querySelector('.brainstorm-container');
			if (!container) return;
			const arrow = container.querySelector('.kobajer-arrow');

			let badge = container.querySelector('.kobajer-kravling-2024-badge');
			if (!badge) {
				badge = document.createElement('div');
				badge.className = 'kobajer-kravling-2024-badge';
				badge.innerHTML = `
					<div class="kobajer-kravling-2024-text">
						<div class="kravling-line1">KRAVLINGPRISEN</div>
						<div class="kravling-line2">NOMINERET</div>
						<div class="kravling-line3">2024</div>
					</div>
				`;
				container.appendChild(badge);
			}

			// Always keep it in the DOM (never "disappear"), even if we still need to re-position.
			badge.style.display = 'block';

			// If the arrow element isn't present yet, keep the badge visible in a safe fallback spot,
			// and retry shortly until the arrow exists.
			if (!arrow) {
				// Keep last known good coordinates if we have them
				if (badge.dataset.lastLeft && badge.dataset.lastTop) {
					badge.style.left = badge.dataset.lastLeft;
					badge.style.top = badge.dataset.lastTop;
					badge.style.transform = badge.dataset.lastTransform || 'translateX(-50%) rotate(-2deg)';
				} else {
					// Fallback: place roughly under the KØ-BAJER node so it's visible immediately.
					const kobajerNode = Array.from(document.querySelectorAll('.project-node')).find(n => {
						const href = (n.getAttribute('href') || '').toLowerCase();
						const text = (n.textContent || '').trim().toUpperCase();
						return href.includes('kobajer') || text.includes('KØ-BAJER');
					});
					if (kobajerNode) {
						const containerRect = container.getBoundingClientRect();
						const nr = kobajerNode.getBoundingClientRect();
						const x = (nr.left - containerRect.left) + (nr.width / 2);
						const y = (nr.bottom - containerRect.top);
						badge.style.left = `${x - 18}px`;
						badge.style.top = `${y - 20}px`;
						badge.style.transform = 'translateX(-50%) rotate(-2deg)';
					}
				}

				const tries = Number(badge.dataset.kravling2024Tries || '0');
				if (tries < 20) {
					badge.dataset.kravling2024Tries = String(tries + 1);
					window.setTimeout(createAndPositionKobajerKravling2024Label, 140);
				}
				return;
			}

			// If the arrow hasn't loaded yet, its rect can be 0 and the badge would be positioned wrong.
			// In that case: keep the badge, but retry positioning shortly.
			const arrowRectNow = arrow.getBoundingClientRect();
			if (!arrowRectNow.width || !arrowRectNow.height) {
				// Keep last good position while waiting
				if (badge.dataset.lastLeft && badge.dataset.lastTop) {
					badge.style.left = badge.dataset.lastLeft;
					badge.style.top = badge.dataset.lastTop;
					badge.style.transform = badge.dataset.lastTransform || 'translateX(-50%) rotate(-2deg)';
				}
				const tries = Number(arrow.dataset.kravling2024Tries || '0');
				if (tries < 16) {
					arrow.dataset.kravling2024Tries = String(tries + 1);
					window.setTimeout(createAndPositionKobajerKravling2024Label, 120);
				}
				return;
			}
			// If an older badge exists without the wrapper, wrap the lines so we can size rays to text.
			let textWrap = badge.querySelector('.kobajer-kravling-2024-text');
			if (!textWrap) {
				textWrap = document.createElement('div');
				textWrap.className = 'kobajer-kravling-2024-text';
				const lines = Array.from(badge.querySelectorAll('.kravling-line1, .kravling-line2, .kravling-line3'));
				lines.forEach(l => textWrap.appendChild(l));
				badge.insertBefore(textWrap, badge.firstChild);
			}

			// Ensure charcoal ray layer exists (for hover over KØ-BAJER)
			let sparks = badge.querySelector('.kobajer-kravling-2024-sparks');
			if (!sparks) {
				sparks = document.createElement('div');
				sparks.className = 'kobajer-kravling-2024-sparks';
				badge.appendChild(sparks);
			}

			const containerRect = container.getBoundingClientRect();
			const r = arrow.getBoundingClientRect();

			// Arrow tip ≈ bottom-center of its visual bounding box
			const tipX = (r.left - containerRect.left) + (r.width / 2);
			const tipY = (r.bottom - containerRect.top);

			badge.style.left = `${tipX - 28}px`; // a bit more to the left
			badge.style.top = `${tipY - 36}px`;  // slightly more up
			badge.style.transform = 'translateX(-50%) rotate(-2deg)';
			badge.dataset.lastLeft = badge.style.left;
			badge.dataset.lastTop = badge.style.top;
			badge.dataset.lastTransform = badge.style.transform;

			// Size/center the animation *around the text* (not the whole badge).
			// This makes the ring hug the 3-line text block.
			const badgeRect = badge.getBoundingClientRect();
			const textRect = textWrap.getBoundingClientRect();
			const textCenterX = (textRect.left - badgeRect.left) + (textRect.width / 2);
			const textCenterY = (textRect.top - badgeRect.top) + (textRect.height / 2);

			// Padding around the text (tune feel here)
			const padX = 64; // base horizontal padding (ring is stretched via scaleX below)
			const padY = 40; // slightly bigger at the top (we bias upward below)
			const ringW = Math.max(120, textRect.width + padX);
			const ringH = Math.max(90, textRect.height + padY);

			sparks.style.left = `${textCenterX - 6}px`;
			// Bias slightly upward, but leave a tiny bit more bottom
			sparks.style.top = `${textCenterY - 7}px`;
			sparks.style.width = `${ringW}px`;
			sparks.style.height = `${ringH}px`;
			// Make the ring more horizontally long (ellipse)
			const scaleX = 1.65;
			const scaleY = 0.90;
			sparks.style.transform = `translate(-50%, -50%) scaleX(${scaleX}) scaleY(${scaleY})`;

			// Rebuild rays with radius based on the text ring size
			// Use height as the basis so scaleX turns it into an ellipse (wider without getting taller).
			const ringR = Math.max(26, (ringH / 2) - 10);
			const rayH = Math.max(46, Math.round(ringR * 1.25));
			fillCharcoalRays(sparks, 14, { r: ringR, h: rayH });
		}

		// Brainfarts hover: start/stop farting
		let isFarting = false;
		let fartResetTimeoutId = null;
		function startBrainFart() {
			if (!fartLayer) return;
			if (isFarting) return; // one single animation per hover
			isFarting = true;
			if (brain) brain.classList.add('is-farting');

			// Single burst (one animation): spawn a few puffs once
			for (let i = 0; i < 4; i++) createFartClouds();

			// Allow a new burst after the animation is done
			if (fartResetTimeoutId) window.clearTimeout(fartResetTimeoutId);
			fartResetTimeoutId = window.setTimeout(() => {
				isFarting = false;
				if (brain) brain.classList.remove('is-farting');
				fartResetTimeoutId = null;
			}, 1600);
		}
		function stopBrainFart() {
			isFarting = false;
			if (fartResetTimeoutId) {
				window.clearTimeout(fartResetTimeoutId);
				fartResetTimeoutId = null;
			}
			if (brain) brain.classList.remove('is-farting');
			// Clear remaining puffs quickly
			if (fartLayer) fartLayer.querySelectorAll('.fart-cloud').forEach(el => el.remove());
		}

		// Create asset elements
		function createAssets() {
			console.log('Creating assets...');
			
			// Condom asset for Durex
			const condomAsset = document.createElement('img');
			condomAsset.src = 'assets/kondom asset.webp';
			condomAsset.className = 'condom-asset';
			condomAsset.style.cssText = `
				position: absolute;
				width: 135px;
				height: auto;
				top: -22%;
				left: 42%;
				opacity: 0;
				display: none;
				z-index: 10;
				transform: rotate(20deg);
			`;
			brain.appendChild(condomAsset);
			console.log('Condom asset created');

			// Korn asset for Byens Landhandel
			const kornAsset = document.createElement('img');
			kornAsset.src = 'assets/korn asset.webp';
			kornAsset.className = 'korn-asset';
			kornAsset.style.cssText = `
				position: absolute;
				width: 440px;
				height: 380px;
				top: 50%;
				left: 50%;
				margin-top: -190px;
				margin-left: -220px;
				opacity: 0;
				display: none;
				z-index: 25;
				object-fit: fill;
			`;
			brain.appendChild(kornAsset);

			// Kasket asset for Repop
			const kasketAsset = document.createElement('img');
			kasketAsset.src = 'assets/Kasket asset.webp';
			kasketAsset.className = 'kasket-asset';
			kasketAsset.style.cssText = `
				position: absolute;
				width: 180px;
				height: 140px;
				top: 10%;
				left: 50%;
				transform: translate(-50%, -50%);
				opacity: 0;
				display: none;
				z-index: 10;
				object-fit: fill;
			`;
			brain.appendChild(kasketAsset);

			// Øldåse asset for Købajer
			const oldaseAsset = document.createElement('img');
			oldaseAsset.src = 'assets/øldåse asset.webp';
			oldaseAsset.className = 'oldase-asset';
			oldaseAsset.style.cssText = `
				position: absolute;
				width: 110px;
				height: auto;
				top: 55%;
				left: -35%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(oldaseAsset);

			// Naturli' asset
			const naturliAsset = document.createElement('img');
			naturliAsset.src = 'assets/Naturli\' asset.webp';
			naturliAsset.className = 'naturli-asset';
			naturliAsset.style.cssText = `
				position: absolute;
				width: 115px;
				height: auto;
				top: -32%;
				right: -42%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(naturliAsset);

			// Naturli' drops asset
			const dropsAsset = document.createElement('img');
			dropsAsset.src = 'asset drops naturlig.png';
			dropsAsset.className = 'naturli-drops-asset';
			dropsAsset.style.cssText = `
				position: absolute;
				width: 56px;
				height: auto;
				top: -38%;
				right: -27%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(dropsAsset);

			// Twister asset
			const twisterAsset = document.createElement('img');
			twisterAsset.src = 'assets/Twister asset.webp';
			twisterAsset.className = 'twister-asset';
			twisterAsset.style.cssText = `
				position: absolute;
				width: 85px;
				height: auto;
				top: 62%;
				right: 27%;
				opacity: 0;
				display: none;
				z-index: 25;
			`;
			brain.appendChild(twisterAsset);

			// Unge mod UV asset
			const ungeModUvAsset = document.createElement('img');
			ungeModUvAsset.src = 'assets/Unge mod UV asset.webp';
			ungeModUvAsset.className = 'unge-mod-uv-asset';
			ungeModUvAsset.style.cssText = `
				position: absolute;
				width: 160px;
				height: auto;
				top: 55%;
				left: 78%;
				opacity: 0;
				display: none;
				z-index: 10;
			`;
			brain.appendChild(ungeModUvAsset);
		}

		// TWISTER hover: tongue "lick" animation (over -> under the icecream)
		let twisterTongueRafId = null;
		let twisterTonguePhase = 'over'; // 'over' | 'under' | 'pause'
		let twisterTonguePhaseStart = 0;
		let twisterTongueFirstRun = true;

		function createTwisterTongues() {
			if (!brain) return;
			const src = `assets/${encodeURIComponent('tunge til hjerne.webp')}`;

			// If already exists, just update src (so swapping assets works without reload)
			const existing = brain.querySelectorAll('.brain-tongue');
			if (existing && existing.length) {
				existing.forEach((el) => {
					if (el && el.tagName && el.tagName.toLowerCase() === 'img') el.src = src;
				});
				return;
			}

			const under = document.createElement('img');
			under.className = 'brain-tongue tongue-under';
			under.alt = '';
			under.draggable = false;
			under.src = src;
			under.setAttribute('aria-hidden', 'true');

			const over = document.createElement('img');
			over.className = 'brain-tongue tongue-over';
			over.alt = '';
			over.draggable = false;
			over.src = src;
			over.setAttribute('aria-hidden', 'true');

			// Under first, then over, so stacking is consistent
			brain.appendChild(under);
			brain.appendChild(over);
		}

		function startTwisterTongue() {
			if (!brain) return;
			createTwisterTongues();

			const over = brain.querySelector('.brain-tongue.tongue-over');
			const under = brain.querySelector('.brain-tongue.tongue-under');
			if (!over || !under) return;

			// Cancel any running loop
			if (twisterTongueRafId) cancelAnimationFrame(twisterTongueRafId);
			twisterTongueRafId = null;

			// Show both (we'll animate one at a time)
			over.classList.add('is-visible');
			under.classList.add('is-visible');

			// Helpers
			function easeInOut(t) {
				// stronger ease-in-out (cubic)
				t = Math.max(0, Math.min(1, t));
				return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			}

			const brainSvg = brain.querySelector('svg');
			const mouthPath = brain.querySelector('.brain-mouth');
			if (!brainSvg || !mouthPath) return;

			// reset state
			twisterTonguePhase = 'pause'; // start with a tiny delay before first lick
			twisterTonguePhaseStart = performance.now();
			twisterTongueFirstRun = true;

			const overDur = 1180;
			const underDur = 1180;
			const pauseDur = 680;
			const initialDelay = 180; // start a little later on hover

			const tick = (now) => {
				if (!brain || brain.dataset.twisterTongueActive !== '1') {
					twisterTongueRafId = null;
					return;
				}

				const svgRect = brainSvg.getBoundingClientRect();
				const brainRect = brain.getBoundingClientRect();

				// Build/refresh a hidden "track" path that matches the mouth exactly.
				let track = brainSvg.querySelector('.tongue-track');
				if (!track) {
					track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
					track.classList.add('tongue-track');
					track.setAttribute('fill', 'none');
					track.setAttribute('stroke', 'none');
					brainSvg.appendChild(track);
				}
				const d = mouthPath.getAttribute('d') || '';
				track.setAttribute('d', d);

				let totalLen = 0;
				try {
					totalLen = track.getTotalLength();
				} catch {
					twisterTongueRafId = requestAnimationFrame(tick);
					return;
				}
				if (!Number.isFinite(totalLen) || totalLen <= 0) {
					twisterTongueRafId = requestAnimationFrame(tick);
					return;
				}

				const elapsed = now - twisterTonguePhaseStart;
				let activeEl = null;
				let t = 0;
				let baseUnder = 0;

				if (twisterTonguePhase === 'over') {
					activeEl = over;
					t = Math.min(1, elapsed / overDur);
					baseUnder = -7; // will be shaped by progress below
					if (t >= 1) { twisterTonguePhase = 'under'; twisterTonguePhaseStart = now; }
				} else if (twisterTonguePhase === 'under') {
					activeEl = under;
					t = Math.min(1, elapsed / underDur);
					baseUnder = -7; // will be shaped by progress below
					if (t >= 1) { twisterTonguePhase = 'pause'; twisterTonguePhaseStart = now; }
				} else {
					// pause
					activeEl = null;
					const curPause = twisterTongueFirstRun ? initialDelay : pauseDur;
					if (elapsed >= curPause) {
						twisterTonguePhase = 'over';
						twisterTonguePhaseStart = now;
						twisterTongueFirstRun = false;
					}
				}

				// Hide the non-active tongue while keeping it ready
				if (activeEl !== over) over.style.opacity = '0';
				if (activeEl !== under) under.style.opacity = '0';

				if (activeEl) {
					// Start a little later and end a tiny sooner within each pass
					const lead = 0.08; // 8% delay before showing/moving
					const tail = 0.06; // 6% cut at the end
					const tEff = Math.max(0, Math.min(1, (t - lead) / Math.max(0.001, (1 - lead - tail))));
					const tt = easeInOut(tEff);
					// Make the tongue sit slightly LOWER on the right side of the mouth.
					// Left start should stay where it is; right end was too high.
					// Over (L->R): -7 at left -> +11 at right, PLUS extra "down" only at the far right tip
					// Under (R->L): mirror that (extra "down" only at the start when it's at the far right)
					const tipBoost = 4 * Math.pow(tt, 4); // mostly affects the last ~20% near the right end
					const leftLift = -2 * Math.pow(1 - tt, 4); // slightly UP at the far left start
					// At the far right tip, lift it a touch (it was still a bit too low there)
					const rightLift = -1.6 * Math.pow(tt, 4);
					if (activeEl === over) baseUnder = -7 + (18 * tt) + tipBoost + leftLift + rightLift;
					else baseUnder = 11 - (18 * tt) + (4 * Math.pow(1 - tt, 4)) + (-2 * Math.pow(tt, 4)) + (-1.6 * Math.pow(1 - tt, 4));

					// Over: left->right, Under: right->left along the *actual path length*
					// Don't go as far left/right as before
					const startLen = totalLen * 0.12;
					const endLen = totalLen * 0.86;
					const len = (activeEl === over)
						? (startLen + (endLen - startLen) * tt)
						: (endLen - (endLen - startLen) * tt);

					const pt = track.getPointAtLength(len);
					const pt2 = track.getPointAtLength(Math.min(totalLen, len + 1));
					const dx = (pt2.x - pt.x) || 0.0001;
					const dy = (pt2.y - pt.y) || 0.0001;
					// angle of tangent
					const ang = Math.atan2(dy, dx);

					// normal (perpendicular) pointing downward (positive y)
					let nx = -dy;
					let ny = dx;
					const nLen = Math.hypot(nx, ny) || 1;
					nx /= nLen;
					ny /= nLen;
					// ensure it points downward
					if (ny < 0) { nx *= -1; ny *= -1; }

					// map SVG viewBox coords (0..100) into pixels
					const xPx = (pt.x / 100) * svgRect.width;
					const yPx = (pt.y / 100) * svgRect.height;

					// svg isn't guaranteed to start at (0,0) inside .brain (borders/positioning),
					// so convert SVG pixel coords -> .brain-local coords
					const xInBrain = xPx + (svgRect.left - brainRect.left);
					const yInBrain = yPx + (svgRect.top - brainRect.top);

					// offset just under the mouth line, following the curve
					const offX = nx * baseUnder;
					const offY = ny * baseUnder;

					activeEl.style.left = `${xInBrain + offX}px`;
					activeEl.style.top = `${yInBrain + offY}px`;

					// Rotate slightly with the mouth slope
					const rotDeg = (ang * 180 / Math.PI);

					// Start should use a fade-in only (no fade-out, no blur)
					const fadeIn = 0.12;
					const fadeOut = 0.12;
					let alpha = 1;
					if (t < lead) alpha = 0;
					else if (t > (1 - tail)) alpha = 0;
					else if (tEff < fadeIn) alpha = easeInOut(tEff / fadeIn);
					else if (tEff > (1 - fadeOut)) alpha = easeInOut((1 - tEff) / fadeOut);
					activeEl.style.opacity = String(alpha);
					activeEl.style.filter = `var(--tongueBaseFilter)`;

					// Anchor higher so the tongue sits up into the mouth line
					activeEl.style.transform = `translate(-50%, -40%) rotate(${rotDeg}deg) scale(1)`;
				}

				twisterTongueRafId = requestAnimationFrame(tick);
			};

			twisterTongueRafId = requestAnimationFrame(tick);
		}

		function stopTwisterTongue() {
			if (!brain) return;
			brain.dataset.twisterTongueActive = '0';
			if (twisterTongueRafId) cancelAnimationFrame(twisterTongueRafId);
			twisterTongueRafId = null;
			const over = brain.querySelector('.brain-tongue.tongue-over');
			const under = brain.querySelector('.brain-tongue.tongue-under');
			if (over) { over.classList.remove('is-visible'); over.style.opacity = ''; over.style.transform = ''; over.style.filter = ''; }
			if (under) { under.classList.remove('is-visible'); under.style.opacity = ''; under.style.transform = ''; under.style.filter = ''; }
		}

	// Create connecting lines from brain to nodes
	function createConnectingLines() {
		console.log('Creating connecting lines...');
		
		// Get fresh references to elements
		const currentSvg = document.querySelector('.connecting-lines');
		const currentBrain = document.querySelector('.brain');
		const currentNodes = document.querySelectorAll('.project-node');
		
		console.log('SVG element:', currentSvg);
		console.log('Brain element:', currentBrain);
		console.log('Nodes found:', currentNodes.length);
		
		if (!currentSvg || !currentBrain || !currentNodes.length) {
			console.log('Missing elements for line creation');
			return;
		}
		
		// Remove ONLY dynamic lines/paths we previously created and redraw them.
		// This preserves any static SVG lines in `projects.html` (e.g. NATURLI) and avoids double-stacking.
		currentSvg.querySelectorAll('.dynamic-mindmap-line').forEach(el => el.remove());
		// Note: circles/frames are handled separately by createHandDrawnFrames()
		
		// Note: All existing lines are cleared above, so we start with a clean slate
		
		const container = document.querySelector('.brainstorm-container');
		const brainRect = currentBrain.getBoundingClientRect();
		const containerRect = container.getBoundingClientRect();

		// Note: The TWISTER↔D&AD line is handled as a normal positioned <img> for reliability.
		
		// Calculate center of brain relative to container
		const centerX = brainRect.left - containerRect.left + brainRect.width / 2;
		const centerY = brainRect.top - containerRect.top + brainRect.height / 2;
		
		// Calculate brain radius to create gap
		const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
		const gapDistance = brainRadius * 1.0; // 100% of brain radius as gap - balanced gap
		
		console.log('Brain center:', centerX, centerY);
		console.log('Container dimensions:', containerRect.width, containerRect.height);
		
		// Create hand-drawn lines to each project node
		currentNodes.forEach((node, index) => {
			const nodeRect = node.getBoundingClientRect();
			const nodeX = nodeRect.left - containerRect.left + nodeRect.width / 2;
			const nodeY = nodeRect.top - containerRect.top + nodeRect.height / 2;
			
			console.log(`Node ${index} (${node.textContent.trim()}):`, nodeX, nodeY);
			
			// Check if node has valid dimensions
			if (nodeRect.width === 0 || nodeRect.height === 0) {
				console.log(`Node ${index} has zero dimensions! Skipping line creation.`);
				return;
			}
			
			// Special case: BRAINFARTS - render linje 8.webp asset line from brain center to node
			const nodeTextBrainfarts = node.textContent.trim();
			const nodeHrefBrainfarts = node.getAttribute('href') || '';
			if (nodeTextBrainfarts === 'BRAINFARTS' || nodeHrefBrainfarts.includes('brainfarts') || nodeHrefBrainfarts.includes('project1')) {
				console.log(`✓ BRAINFARTS detected at index ${index} - creating Linje 8.webp asset line`);
				
				// Start from slightly backward of the brain center (extending toward brain)
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const deltaX = nodeX - centerX;
				const deltaY = nodeY - centerY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Extend backward from brain center to make line longer toward brain
				const brainExtension = brainRadius * 0.38; // Extend further toward brain
				const brainStartX = centerX - (deltaX / distance) * brainExtension;
				const brainStartY = centerY - (deltaY / distance) * brainExtension;
				
				// Calculate end point - extend closer to/past the BRAINFARTS node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				// Extend past the node center for a longer line
				const extensionAmount = nodeRadius * 1.05; // Extend further toward BRAINFARTS
				const lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				const lineEndY = nodeY + (deltaY / distance) * extensionAmount;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('BRAINFARTS Linje 8 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 8.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 8.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 195); // Offset by half height (390/2 = 195) to center on rotation point
				lineImage.setAttribute('width', lineLength); // Longer
				lineImage.setAttribute('height', '390'); // Slightly bigger/thicker line asset
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log(`✓ BRAINFARTS linje 8.webp asset line created and added to SVG`);
				return; // Skip the hand-drawn line creation for BRAINFARTS
			}
			
			// Special case: KØ-BAJER - render linje 4.webp asset line from brain center to node
			const nodeTextKobajer = node.textContent.trim();
			const nodeHrefKobajer = node.getAttribute('href') || '';
			if (nodeTextKobajer === 'KØ-BAJER' || nodeHrefKobajer.includes('kobajer')) {
				console.log(`✓ KØ-BAJER detected at index ${index} - creating Linje 4.webp asset line`);
				
				// Start from slightly backward of the brain center (extending toward brain)
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const deltaX = nodeX - centerX;
				const deltaY = nodeY - centerY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Extend backward from brain center to make line longer toward brain
				const brainExtension = brainRadius * 0.1; // Extend 10% of brain radius backward (slightly longer)
				const brainStartX = centerX - (deltaX / distance) * brainExtension;
				const brainStartY = centerY - (deltaY / distance) * brainExtension;
				
				// Calculate end point - extend to/past the KØ-BAJER node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				// Extend past the node center for a longer line
				const extensionAmount = nodeRadius * 1.10; // Extend further toward KØ-BAJER
				const lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				const lineEndY = nodeY + (deltaY / distance) * extensionAmount;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('KØ-BAJER Linje 4 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line - use same pattern as BRAINFARTS
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/Linje 4.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/Linje 4.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 200); // Offset by half height (400/2 = 200) to center on rotation point
				lineImage.setAttribute('width', lineLength);
				lineImage.setAttribute('height', '400');
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log('✓ KØ-BAJER Linje 4.webp asset line created and added to SVG');
				
				return; // Skip further hand-drawn processing for KØ-BAJER
			}
			
			// Special case: DUREX X GUESS WHO - render linje 6.webp asset line from brain center to node
			const nodeTextDurex = node.textContent.trim();
			const nodeHrefDurex = node.getAttribute('href') || '';
			if (nodeTextDurex === 'DUREX X GUESS WHO' || nodeHrefDurex.includes('durex')) {
				console.log(`✓ DUREX X GUESS WHO detected at index ${index} - creating linje 6.webp asset line`);
				
				// Start from the center of the brain
				const brainCenterX = centerX;
				const brainCenterY = centerY;
				
				// Calculate end point - stop before reaching the DUREX node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const deltaX = nodeX - brainCenterX;
				const deltaY = nodeY - brainCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Stop before the node center (bigger gap => shorter toward DUREX)
				const gapDistance = nodeRadius * 0.32; // Slightly shorter toward DUREX
				const lineEndX = nodeX - (deltaX / distance) * gapDistance;
				const lineEndY = nodeY - (deltaY / distance) * gapDistance;
				
				// Add gap from brain center (smaller gap => longer toward brain)
				const brainGapDistance = nodeRadius * 0.08; // Smaller gap => longer toward brain
				const brainStartX = brainCenterX + (deltaX / distance) * brainGapDistance;
				const brainStartY = brainCenterY + (deltaY / distance) * brainGapDistance;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const calculatedLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				const lineLength = calculatedLength; // Use full length
				
				console.log('DUREX linje 6 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 6.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 6.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 150); // Offset by half height (300/2 = 150) to center on rotation point
				lineImage.setAttribute('width', lineLength);
				lineImage.setAttribute('height', '300'); // Reduced height to make line thinner
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log('✓ DUREX linje 6.webp asset line created and added to SVG');
				
				return; // Skip further hand-drawn processing for DUREX
			}
			
			// Special case: UNGE MOD UV - render linje 5.webp asset line from brain center to node (down to the right)
			const nodeTextUngeModUv = node.textContent.trim();
			const nodeHrefUngeModUv = node.getAttribute('href') || '';
			if (nodeTextUngeModUv === 'UNGE MOD UV' || nodeHrefUngeModUv.includes('unge-mod-uv')) {
				console.log(`✓ UNGE MOD UV detected at index ${index} - creating linje 5.webp asset line (down to the right)`);
				
				// Start from the center of the brain, extended backward toward brain
				const brainCenterX = centerX;
				const brainCenterY = centerY;
				
				// Calculate end point - extend closer to/past the UNGE MOD UV node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const deltaX = nodeX - brainCenterX;
				const deltaY = nodeY - brainCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Extend past the node center (slightly shorter than before)
				const extensionAmount = nodeRadius * 0.5; // Extend 50% of node radius past the center
				const lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				const lineEndY = nodeY + (deltaY / distance) * extensionAmount;
				
				// Add gap from brain center, then extend backward toward brain
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const brainGapDistance = nodeRadius * 0.4; // Gap from brain center
				const initialBrainStartX = brainCenterX + (deltaX / distance) * brainGapDistance;
				const initialBrainStartY = brainCenterY + (deltaY / distance) * brainGapDistance;
				
				// Extend backward from initial start point to make line longer toward brain
				const brainExtension = brainRadius * 0.1; // Extend 10% of brain radius backward (slightly longer)
				const brainStartX = initialBrainStartX - (deltaX / distance) * brainExtension;
				const brainStartY = initialBrainStartY - (deltaY / distance) * brainExtension;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('UNGE MOD UV linje 5 details (from center, down to the right):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line - use same pattern as KØ-BAJER
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 5.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 5.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 150); // Offset by half height (300/2 = 150) to center on rotation point
				lineImage.setAttribute('width', lineLength);
				lineImage.setAttribute('height', '300'); // Reduced height to make line thinner
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log('✓ UNGE MOD UV linje 5.webp asset line created and added to SVG (down to the right)');
				
				return; // Skip further hand-drawn processing for UNGE MOD UV
			}
			
			// Special case: Use image for BYENS LANDHANDEL (check by data-visual-key/text/href)
			const nodeTextByens = node.textContent.trim();
			const nodeHrefByens = (node.getAttribute('href') || '').toLowerCase();
			const nodeVisualKey = (node.dataset.visualKey || '').toLowerCase();
			if (nodeVisualKey === 'byens-landhandel' || nodeTextByens === 'Byens Landhandel' || nodeHrefByens.includes('byens-landhandel')) {
				console.log('Creating line for BYENS LANDHANDEL', {nodeX, nodeY, centerX, centerY});
				
				// Anchor the line under a specific letter instead of dead-center.
				// "Byens Landhandel": the user wants the line connected under the "e" in "Byens",
				// so we aim a bit left-of-center and slightly lower than the node center.
				const byensAnchorX = nodeRect.left - containerRect.left + nodeRect.width * 0.44;
				const byensAnchorY = nodeRect.top - containerRect.top + nodeRect.height * 0.78;
				
				// Start from below the top of the brain, then extend slightly toward the brain
				const initialBrainStartX = centerX;
				const initialBrainStartY = brainRect.top - containerRect.top + 50; // Below top of brain
				
				// End further toward the tab (extend a bit past the tab center)
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const nodeExtension = nodeRadius * 0.25;
				const deltaX = byensAnchorX - initialBrainStartX;
				const deltaY = byensAnchorY - initialBrainStartY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				const lineEndX = byensAnchorX + (deltaX / distance) * nodeExtension;
				const lineEndY = byensAnchorY + (deltaY / distance) * nodeExtension;
				
				// Extend backward from the initial start point to make the line longer toward the brain
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const brainExtension = brainRadius * 0.28;
				const brainStartX = initialBrainStartX - (deltaX / distance) * brainExtension;
				const brainStartY = initialBrainStartY - (deltaY / distance) * brainExtension;
				
				// Calculate angle for rotation
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('Line details:', {brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength});
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 1.webp');
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 200); // Center vertically
				lineImage.setAttribute('width', lineLength);
				lineImage.setAttribute('height', '400');
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				currentSvg.appendChild(lineImage);
				console.log(`Line image created for BYENS LANDHANDEL`);
				return; // Skip the hand-drawn line creation for BYENS LANDHANDEL
			}
			
			// Special case: Use image for REPOP BY DEPOP (check by data-visual-key/text/href)
			const nodeTextRepop = node.textContent.trim();
			const nodeHrefRepop = (node.getAttribute('href') || '').toLowerCase();
			const nodeVisualKeyRepop = (node.dataset.visualKey || '').toLowerCase();
			if (nodeVisualKeyRepop === 'repop' || nodeTextRepop === 'REPOP BY DEPOP' || nodeHrefRepop.includes('repop')) {
				// Start from below the top of the brain, extended backward toward brain
				const initialBrainStartX = centerX;
				const initialBrainStartY = brainRect.top - containerRect.top + 50; // Below top of brain
				
				// End closer to the tab (smaller gap)
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const tabGapDistance = nodeRadius * 0.1;
				const deltaX = nodeX - initialBrainStartX;
				const deltaY = nodeY - initialBrainStartY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				const lineEndX = nodeX - (deltaX / distance) * tabGapDistance;
				const lineEndY = nodeY - (deltaY / distance) * tabGapDistance;
				
				// Extend backward from brain start point to make line longer toward brain
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const brainExtension = brainRadius * 0.32; // Extend further toward brain (longer line)
				const brainStartX = initialBrainStartX - (deltaX / distance) * brainExtension;
				const brainStartY = initialBrainStartY - (deltaY / distance) * brainExtension;
				
				// Calculate angle for rotation
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/Linje 2.webp');
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 22); // Center vertically (even thinner)
				lineImage.setAttribute('width', lineLength * 0.92); // Slightly shorter
				lineImage.setAttribute('height', '45'); // Even thinner line
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				currentSvg.appendChild(lineImage);
				console.log(`Line image created for REPOP BY DEPOP`);
				return; // Skip the hand-drawn line creation for REPOP BY DEPOP
			}
			
			// Special case: NATURLI' - render linje 7.webp asset line from brain center to node
			const nodeTextNaturli = node.textContent.trim();
			const nodeHrefNaturli = node.getAttribute('href') || '';
			if (nodeTextNaturli === 'NATURLI\'' || nodeHrefNaturli.includes('Naturli') || index === 2) {
				console.log(`✓ NATURLI' detected at index ${index} - creating linje 7.webp asset line`);
				
				// Start from the center of the brain
				const brainCenterX = centerX;
				const brainCenterY = centerY;
				
				// Calculate end point - extend closer to/past the NATURLI' node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				const deltaX = nodeX - brainCenterX;
				const deltaY = nodeY - brainCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				// Small gap from node
				const tabGapDistance = nodeRadius * 0.1;
				const lineEndX = nodeX - (deltaX / distance) * tabGapDistance;
				const lineEndY = nodeY - (deltaY / distance) * tabGapDistance;
				
				// Add gap from brain center to make line shorter toward brain
				const brainGapDistance = nodeRadius * 0.4; // Gap from brain center
				const brainStartX = brainCenterX + (deltaX / distance) * brainGapDistance;
				const brainStartY = brainCenterY + (deltaY / distance) * brainGapDistance;
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('NATURLI\' linje 7 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 7.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 7.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 100); // Offset by half height (200/2 = 100) to center on rotation point
				lineImage.setAttribute('width', lineLength);
				lineImage.setAttribute('height', '200'); // Further reduced height to make line thinner
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.dataset.nodeIndex = String(index);
				lineImage.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log(`✓ NATURLI' linje 7.webp asset line created and added to SVG`);
				return; // Skip the hand-drawn line creation for NATURLI'
			}
			
			// Special case: TWISTER - render linje 3.webp asset line from brain center to node
			const nodeTextTwister = node.textContent.trim();
			const nodeHrefTwister = node.getAttribute('href') || '';
			if (nodeTextTwister === 'TWISTER' || nodeHrefTwister.includes('twister')) {
				console.log(`✓ TWISTER detected at index ${index} - creating Linje 3.webp asset line`);
				
				// Start from outside the brain (add gap from brain center)
				const brainRadius = Math.min(brainRect.width, brainRect.height) / 2;
				const brainGapDistance = brainRadius * 0.45; // Start closer to brain (longer line)
				const deltaX = nodeX - centerX;
				const deltaY = nodeY - centerY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
				const brainStartX = centerX + (deltaX / distance) * brainGapDistance;
				const brainStartY = centerY + (deltaY / distance) * brainGapDistance - 30; // Move line up by 30px
				
				// Calculate end point - extend to/past the TWISTER node
				const nodeRadius = Math.min(nodeRect.width, nodeRect.height) / 2;
				// Extend past the node center for a longer line
				const extensionAmount = nodeRadius * 1.3; // Extend further toward TWISTER
				const lineEndX = nodeX + (deltaX / distance) * extensionAmount;
				const lineEndY = nodeY + (deltaY / distance) * extensionAmount - 30; // Move line up by 30px
				
				// Calculate rotation and length for the image asset
				const angle = Math.atan2(lineEndY - brainStartY, lineEndX - brainStartX) * 180 / Math.PI;
				const lineLength = Math.sqrt((lineEndX - brainStartX) ** 2 + (lineEndY - brainStartY) ** 2);
				
				console.log('TWISTER Linje 3 details (from center):', { brainStartX, brainStartY, lineEndX, lineEndY, angle, lineLength });
				
				// Create image element for the line
				const lineImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				lineImage.setAttribute('href', 'assets/linje 3.webp');
				lineImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/linje 3.webp'); // xlink:href for compatibility
				lineImage.setAttribute('x', brainStartX);
				lineImage.setAttribute('y', brainStartY - 300); // Offset by half height (600/2 = 300) to center on rotation point
				lineImage.setAttribute('width', lineLength);
				lineImage.setAttribute('height', '600');
				lineImage.setAttribute('opacity', '1');
				lineImage.setAttribute('preserveAspectRatio', 'none');
				lineImage.setAttribute('transform', `rotate(${angle} ${brainStartX} ${brainStartY})`);
				lineImage.classList.add('mindmap-line', 'dynamic-mindmap-line');
				lineImage.style.pointerEvents = 'auto';
				lineImage.style.display = 'block';
				lineImage.style.visibility = 'visible';
				lineImage.style.imageRendering = 'crisp-edges';
				lineImage.style.filter = 'none';
				
				currentSvg.appendChild(lineImage);
				console.log(`✓ TWISTER linje 3.webp asset line created and added to SVG`);
				return; // Skip the hand-drawn line creation for TWISTER
			}
			
			// BRAINFARTS is already handled earlier with linje 8.webp asset line
			
			// DISABLED: Only use asset images, no hand-drawn paths - but asset images are created above
			return;
			
			// Create curved path with gaps at both ends
			const pathData = `M${startX},${startY} Q${midX + randomOffsetX},${midY + randomOffsetY} ${endX},${endY}`;
			
			// Create multiple overlapping paths with different textures
			const textures = [
				{ filter: 'url(#charcoalTexture)', stroke: '#1a1a1a', width: '5', opacity: '0.4' },
				{ filter: 'url(#roughEdges)', stroke: '#2a2a2a', width: '3.5', opacity: '0.3' },
				{ filter: 'url(#grainyTexture)', stroke: '#333', width: '2.5', opacity: '0.25' },
				{ filter: 'none', stroke: '#1a1a1a', width: '4', opacity: '0.35' }
			];
			
			textures.forEach((texture, i) => {
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				
				// Add slight variations to each path for more organic look
				const variationX = (Math.random() - 0.5) * 8;
				const variationY = (Math.random() - 0.5) * 8;
				const variedPathData = `M${startX + variationX},${startY + variationY} Q${midX + randomOffsetX + variationX},${midY + randomOffsetY + variationY} ${endX + variationX},${endY + variationY}`;
				
				path.setAttribute('d', variedPathData);
				path.setAttribute('stroke', texture.stroke);
				path.setAttribute('stroke-width', texture.width);
				path.setAttribute('opacity', texture.opacity);
				path.setAttribute('fill', 'none');
				path.setAttribute('stroke-linecap', 'round');
				path.setAttribute('stroke-linejoin', 'round');
				path.classList.add('mindmap-line', 'dynamic-mindmap-line');
			path.dataset.nodeIndex = String(index);
			path.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				if (texture.filter !== 'none') {
					path.setAttribute('filter', texture.filter);
				}
				
				currentSvg.appendChild(path);
			});
			
			// Add additional rough texture layers
			for (let j = 0; j < 2; j++) {
				const roughPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				const roughVariationX = (Math.random() - 0.5) * 15;
				const roughVariationY = (Math.random() - 0.5) * 15;
				const roughPathData = `M${startX + roughVariationX},${startY + roughVariationY} Q${midX + randomOffsetX + roughVariationX},${midY + randomOffsetY + roughVariationY} ${endX + roughVariationX},${endY + roughVariationY}`;
				
				roughPath.setAttribute('d', roughPathData);
				roughPath.setAttribute('stroke', j === 0 ? '#444' : '#555');
				roughPath.setAttribute('stroke-width', j === 0 ? '1.5' : '1');
				roughPath.setAttribute('opacity', j === 0 ? '0.2' : '0.15');
				roughPath.setAttribute('fill', 'none');
				roughPath.setAttribute('stroke-linecap', 'round');
				roughPath.setAttribute('stroke-linejoin', 'round');
				roughPath.setAttribute('filter', 'url(#roughEdges)');
				roughPath.classList.add('mindmap-line', 'dynamic-mindmap-line');
			roughPath.dataset.nodeIndex = String(index);
			roughPath.dataset.nodeHref = (node.getAttribute('href') || '').toLowerCase();
				
				currentSvg.appendChild(roughPath);
			}
			
			console.log(`Hand-drawn line ${index} created to (${nodeX}, ${nodeY})`);
		});
		
		console.log('All hand-drawn lines created. SVG children:', currentSvg.children.length);
	}

	// Create hand-drawn circles around project tabs
	function createHandDrawnFrames() {
		console.log('Creating hand-drawn circles...');
		
		const currentSvg = document.querySelector('.connecting-lines');
		const currentNodes = document.querySelectorAll('.project-node');
		const container = document.querySelector('.brainstorm-container');
		
		if (!currentSvg || !currentNodes.length || !container) {
			console.error('Missing elements for frame creation:', {currentSvg, currentNodes: currentNodes.length, container});
			return;
		}

		// Remove existing circles to avoid duplicates when this function runs again (e.g., on resize)
		const existingCircles = currentSvg.querySelectorAll('.hand-drawn-frame, [class*="hand-drawn"], .brainfarts-overlay, image[href*="cirkel"], image[href*="circle"], image[xlink\\:href*="cirkel"], image[xlink\\:href*="circle"], image[href*="brainfarts"], image[href*="repop"], image[href*="kobajer"], image[href*="naturli"], image[href*="twister"], image[href*="durex"], image[href*="unge"]');
		existingCircles.forEach(el => {
			// Only remove if it's a circle/frame element, not a line
			const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
			if (el.classList.contains('hand-drawn-frame') || el.classList.contains('brainfarts-overlay') || 
			    href.includes('cirkel') || href.includes('circle') || href.includes('brainfarts') || 
			    href.includes('repop') || href.includes('kobajer') || href.includes('naturli') || 
			    href.includes('twister') || href.includes('durex') || href.includes('unge')) {
				el.remove();
			}
		});
		
		const containerRect = container.getBoundingClientRect();
		console.log('Container rect:', containerRect);
		
		currentNodes.forEach((node, index) => {
			// Used to map hover -> matching frame element
			node.dataset.nodeIndex = String(index);
			const nodeHref = (node.getAttribute('href') || '').toLowerCase();
			node.dataset.nodeHref = nodeHref;

			const nodeRect = node.getBoundingClientRect();
			const nodeText = node.textContent.trim();
			
			// Get the center of the text node
			const centerX = nodeRect.left - containerRect.left + (nodeRect.width / 2);
			const centerY = nodeRect.top - containerRect.top + (nodeRect.height / 2);
			
			console.log(`Processing node ${index}: "${nodeText}" at (${centerX}, ${centerY})`);
			
			// Special case: BRAINFARTS uses the image instead of hand-drawn circle
			if (nodeText === 'BRAINFARTS') {
				console.log('Creating BRAINFARTS circle image...');
				// Create an image element for BRAINFARTS
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel om brainfarts.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 120); // Center the image (assuming 240px width)
				image.setAttribute('y', centerY - 100); // Center the image (assuming 200px height)
				image.setAttribute('width', '240');
				image.setAttribute('height', '200');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.style.pointerEvents = 'auto'; // Make image visible
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'brainfarts-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				console.log('Creating BRAINFARTS circle image at:', centerX, centerY, 'with path:', imagePath);
				
				// No hover effect for BRAINFARTS - it should stay still when hovering

				// Purple fill behind the circle (hover)
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				// Make it shorter on the RIGHT side only (keep left side roughly the same)
				// Achieved by shifting left and reducing rx by the same amount.
				fill.setAttribute('cx', String(centerX - 1)); // BRAINFARTS: slightly bigger on the left (right edge unchanged)
				// Slightly smaller at the bottom: shift up a bit
				fill.setAttribute('cy', String(centerY - 3)); // BRAINFARTS: slightly smaller at the top (bottom unchanged)
				fill.setAttribute('rx', String(120 * 0.56 + 2)); // BRAINFARTS: slightly bigger on the left (right edge unchanged)
				fill.setAttribute('ry', String(100 * 0.56 - 1)); // BRAINFARTS: slightly smaller at the top (bottom unchanged)
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);
				
				currentSvg.appendChild(image);

				// "Under construction" red line through the circle (use provided asset)
				try {
					const lineImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
					const linePath = 'assets/rød linje.webp';
					lineImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', linePath);
					lineImg.setAttribute('href', linePath);
					lineImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', linePath);

					// Keep it smaller and within the circle-ish area (circle image is 240x200)
					const w = 205; // longer (not too big)
					const h = 160; // extremely thick
					lineImg.setAttribute('width', String(w));
					lineImg.setAttribute('height', String(h));
					// Place it so it goes from RIGHT side -> down to BOTTOM-LEFT
					lineImg.setAttribute('x', String(centerX - (w / 2) - 5)); // more to the left
					lineImg.setAttribute('y', String(centerY - (h / 2) + 4));
					lineImg.setAttribute('preserveAspectRatio', 'none');
					// Slightly see-through so it reads like drawn on paper
					lineImg.setAttribute('opacity', '0.78');
					// Diagonal "/" feel (top-right -> bottom-left)
					lineImg.setAttribute('transform', `rotate(-36 ${centerX} ${centerY})`);

					lineImg.style.pointerEvents = 'none';
					lineImg.style.display = 'block';
					lineImg.style.visibility = 'visible';
					lineImg.classList.add('brainfarts-overlay', 'brainfarts-construction-line');
					lineImg.dataset.nodeIndex = String(index);
					lineImg.dataset.nodeHref = nodeHref;
					currentSvg.appendChild(lineImg);
				} catch {}

				console.log(`✓ BRAINFARTS circle image appended to SVG. SVG children count:`, currentSvg.children.length);
				return; // Skip the hand-drawn circle creation for BRAINFARTS
			}
			
			// Special case: REPOP BY DEPOP uses the image instead of hand-drawn circle
			if (nodeText === 'REPOP BY DEPOP' || nodeHref.includes('repop')) {
				console.log('Creating REPOP BY DEPOP circle image...');
				// Create an image element for REPOP BY DEPOP
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/circle around repop by depop.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 187); // Slightly slightly move (assuming 380px width)
				image.setAttribute('y', centerY - 68); // Center the image (assuming 150px height)
				image.setAttribute('width', '380');
				image.setAttribute('height', '150');
				image.setAttribute('preserveAspectRatio', 'none'); // Allow independent width/height scaling
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('transform', `rotate(180 ${centerX} ${centerY})`);
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'repop-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX - 1)); // slightly bigger on the left (right edge unchanged)
				fill.setAttribute('cy', String(centerY - 2)); // REPOP: slightly bigger at the top
				fill.setAttribute('rx', String(190 * 0.55 - 7)); // slightly bigger on the left (right edge unchanged)
				fill.setAttribute('ry', String(75 * 0.68 - 2)); // REPOP: slightly bigger at the top
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ REPOP BY DEPOP circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for REPOP BY DEPOP
			}
			
			// Special case: KØ-BAJER uses the image instead of hand-drawn circle
			if (nodeText === 'KØ-BAJER') {
				console.log('Creating KØ-BAJER circle image...');
				// Create an image element for KØ-BAJER
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel købajer.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 100); // Move slightly to the left (assuming 200px width)
				image.setAttribute('y', centerY - 90); // Move down (assuming 200px height)
				image.setAttribute('width', '200');
				image.setAttribute('height', '200');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('transform', `rotate(180 ${centerX} ${centerY})`);
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'kobajer-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				// KØ-BAJER: use an ellipse so we can make it smaller at the top/bottom without shrinking the sides too much
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				fill.setAttribute('cy', String(centerY - 5)); // KØ-BAJER: trim bottom (keep top roughly the same)
				fill.setAttribute('rx', String(100 * 0.56));
				fill.setAttribute('ry', String(100 * 0.46 - 5)); // KØ-BAJER: less bottom
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ KØ-BAJER circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for KØ-BAJER
			}
			
			// Special case: NATURLI' uses the image instead of hand-drawn circle
			if (nodeText === 'NATURLI\'') {
				console.log('Creating NATURLI\' circle image...');
				// Create an image element for NATURLI'
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel omkring naturli'.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 120); // Center the image (assuming 240px width)
				image.setAttribute('y', centerY - 65); // Move down slightly (assuming 140px height)
				image.setAttribute('width', '240');
				image.setAttribute('height', '140');
				image.setAttribute('preserveAspectRatio', 'none'); // Prevent aspect ratio from scaling width
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('transform', `rotate(180 ${centerX} ${centerY})`);
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'naturli-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				// NATURLI': make the RIGHT side slightly smaller (keep left edge the same)
				fill.setAttribute('cx', String(centerX + 1));
				fill.setAttribute('cy', String(centerY - 1));
				fill.setAttribute('rx', String(120 * 0.50 - 2));
				fill.setAttribute('ry', String(70 * 0.66));
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ NATURLI' circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for NATURLI'
			}
			
			// Special case: UNGE MOD UV uses the image instead of hand-drawn circle
			if (nodeText === 'UNGE MOD UV') {
				console.log('Creating UNGE MOD UV circle image...');
				// Create an image element for UNGE MOD UV
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/unge mod uv cirkel.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 160); // Center the image (assuming 320px width)
				image.setAttribute('y', centerY - 75); // Center the image (assuming 150px height)
				image.setAttribute('width', '320');
				image.setAttribute('height', '150');
				image.setAttribute('preserveAspectRatio', 'none'); // Allow independent width/height scaling
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'unge-mod-uv-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				fill.setAttribute('cy', String(centerY)); // UNGE MOD UV: keep centered
				fill.setAttribute('rx', String(160 * 0.54)); // UNGE MOD UV: wider left+right
				fill.setAttribute('ry', String(75 * 0.51));  // UNGE MOD UV: slightly more top+bottom
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ UNGE MOD UV circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for UNGE MOD UV
			}
			
			// Special case: TWISTER uses the image instead of hand-drawn circle
			if (nodeText === 'TWISTER') {
				console.log('Creating TWISTER circle image...');
				// Create an image element for TWISTER
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/cirkel omkring twister.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 140); // Center the image (assuming 280px width)
				image.setAttribute('y', centerY - 60); // Center the image (assuming 120px height)
				image.setAttribute('width', '280');
				image.setAttribute('height', '120');
				image.setAttribute('preserveAspectRatio', 'none'); // Allow independent width/height scaling
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'twister-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX + 4)); // TWISTER: less on the left (right edge unchanged)
				fill.setAttribute('cy', String(centerY - 2)); // TWISTER: slightly less bottom
				fill.setAttribute('rx', String(140 * 0.56 - 4)); // TWISTER: less on the left (right edge unchanged)
				fill.setAttribute('ry', String(60 * 0.68 - 4)); // TWISTER: slightly less bottom
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ TWISTER circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for TWISTER
			}
			
			// Special case: BYENS LANDHANDEL uses the image instead of hand-drawn circle
			if (nodeText === 'Byens Landhandel' || nodeHref.includes('byens-landhandel')) {
				console.log('Creating Byens Landhandel circle image...');
				// Create an image element for BYENS LANDHANDEL
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/circle omkring byens landhandel.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				// Slightly larger + adjusted so the tab text fits better inside the circle
				image.setAttribute('x', centerX - 220); // Center the image (440px width)
				image.setAttribute('y', centerY - 85); // Center the image (170px height)
				image.setAttribute('width', '440');
				image.setAttribute('height', '170');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'byens-landhandel-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				fill.setAttribute('cy', String(centerY - 2)); // DUREX: bigger at the top (bottom unchanged)
				fill.setAttribute('rx', String(220 * 0.50 + 3)); // BYENS: slightly bigger on the right (left edge unchanged)
				fill.setAttribute('ry', String(85 * 0.58 - 2));  // slightly smaller at the bottom
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ BYENS LANDHANDEL circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for BYENS LANDHANDEL
			}
			
			// Special case: DUREX X GUESS WHO uses the image instead of hand-drawn circle
			if (nodeText === 'DUREX X GUESS WHO') {
				console.log('Creating DUREX X GUESS WHO circle image...');
				// Create an image element for DUREX X GUESS WHO
				const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
				const imagePath = "assets/circle omkring durex x guess who.webp";
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imagePath);
				image.setAttribute('href', imagePath);
				image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', imagePath);
				image.setAttribute('x', centerX - 220); // Center the image (assuming 440px width)
				image.setAttribute('y', centerY - 75); // Center the image (assuming 150px height)
				image.setAttribute('width', '440');
				image.setAttribute('height', '150');
				image.setAttribute('opacity', '0.8');
				image.setAttribute('visibility', 'visible');
				image.setAttribute('preserveAspectRatio', 'none'); // Force stretching
				image.style.pointerEvents = 'auto';
				image.style.display = 'block';
				image.style.visibility = 'visible';
				image.style.opacity = '0.8';
				image.classList.add('hand-drawn-frame', 'durex-image');
				image.dataset.nodeIndex = String(index);
				image.dataset.nodeHref = nodeHref;
				
				const fill = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
				fill.setAttribute('cx', String(centerX));
				fill.setAttribute('cy', String(centerY - 3)); // DUREX: keep top, trim bottom
				fill.setAttribute('rx', String(220 * 0.55)); // DUREX: less horizontal fill
				fill.setAttribute('ry', String(75 * 0.68 + 1)); // DUREX: keep top, trim bottom
				fill.setAttribute('fill', 'rgba(118, 75, 162, 0.42)');
				fill.classList.add('frame-fill');
				fill.dataset.nodeIndex = String(index);
				fill.dataset.nodeHref = nodeHref;
				const firstLine = currentSvg.querySelector('.mindmap-line');
				if (firstLine) currentSvg.insertBefore(fill, firstLine);
				else currentSvg.appendChild(fill);

				currentSvg.appendChild(image);
				console.log(`✓ DUREX X GUESS WHO circle image appended to SVG`);
				return; // Skip the hand-drawn circle creation for DUREX X GUESS WHO
			}
			
			// Create soft hand-drawn circle with smooth curves for other nodes
			let baseRadius = 50 + Math.random() * 30; // 50-80px radius variation (normal size)
			
			const numPoints = 12 + Math.floor(Math.random() * 8); // 12-20 points for smoother curves
			let pathData = '';
			
			for (let p = 0; p < numPoints; p++) {
				const angle = (p / numPoints) * 2 * Math.PI;
				
				// Add gentle irregularity to the radius for each point
				const radiusVariation = (Math.random() - 0.5) * 10; // ±5px variation (normal)
				const angleVariation = (Math.random() - 0.5) * 0.2; // ±0.1 radians (normal)
				
				let currentRadius = baseRadius + radiusVariation;
				const currentAngle = angle + angleVariation;
				
				const x = centerX + Math.cos(currentAngle) * currentRadius;
				const y = centerY + Math.sin(currentAngle) * currentRadius;
				
				if (p === 0) {
					pathData += `M${x},${y}`;
				} else {
					// Use quadratic curves for smooth, soft transitions
					const prevAngle = ((p - 1) / numPoints) * 2 * Math.PI;
					const midAngle = (prevAngle + currentAngle) / 2;
					const controlRadius = baseRadius + (Math.random() - 0.5) * 8; // Control point radius
					const controlX = centerX + Math.cos(midAngle) * controlRadius;
					const controlY = centerY + Math.sin(midAngle) * controlRadius;
					pathData += ` Q${controlX},${controlY} ${x},${y}`;
				}
			}
			// Sometimes add a "tail" - like the person drew too fast and continued past the circle
			const hasTail = Math.random() < 0.4;
			
			if (hasTail) {
				// Don't close the circle, instead extend it with a tail well outside the circle
				const tailAngle = Math.random() * 2 * Math.PI; // Random direction for tails
				const tailLength = 40 + Math.random() * 40; // 40-80px tail length (much longer to go well outside)
				
				// Start the tail from the last point of the circle
				const lastAngle = ((numPoints - 1) / numPoints) * 2 * Math.PI;
				const lastX = centerX + Math.cos(lastAngle) * baseRadius;
				const lastY = centerY + Math.sin(lastAngle) * baseRadius;
				
				// Extend the tail well beyond the circle's edge - make it go much further out
				const tailEndX = lastX + Math.cos(tailAngle) * tailLength;
				const tailEndY = lastY + Math.sin(tailAngle) * tailLength;
				
				// Create a smooth curve for the tail that goes well outside the circle
				const tailControlX = lastX + Math.cos(tailAngle) * (tailLength * 0.6);
				const tailControlY = lastY + Math.sin(tailAngle) * (tailLength * 0.6);
				
				pathData += ` Q${tailControlX},${tailControlY} ${tailEndX},${tailEndY}`;
			} else {
				pathData += ' Z'; // Close the path normally
			}
			
			const circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			circle.setAttribute('d', pathData);
			
			// Normal styling for other circles
			circle.setAttribute('stroke', '#2a2a2a'); // Softer color
			circle.setAttribute('stroke-width', 1.5 + Math.random() * 1.5); // 1.5-3px stroke width (thinner for softness)
			circle.setAttribute('opacity', 0.4 + Math.random() * 0.3); // 0.4-0.7 opacity (more visible)
			circle.setAttribute('fill', 'none');
			circle.setAttribute('fill-opacity', '0');
			circle.setAttribute('stroke-linecap', 'round');
			circle.setAttribute('stroke-linejoin', 'round');
			circle.setAttribute('filter', 'url(#charcoalTexture)');
			circle.classList.add('hand-drawn-frame');
			circle.dataset.nodeIndex = String(index);
			circle.dataset.nodeHref = nodeHref;
			
			// Fill version behind the stroke path (hover "fills out" the circle)
			const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			fillPath.setAttribute('d', pathData);
			fillPath.setAttribute('fill', 'rgba(118, 75, 162, 0.38)');
			fillPath.setAttribute('stroke', 'none');
			// Shrink fill so it sits inside the hand-drawn outline
			fillPath.setAttribute('transform', `translate(${centerX} ${centerY}) scale(0.70) translate(${-centerX} ${-centerY})`);
			fillPath.classList.add('frame-fill');
			fillPath.dataset.nodeIndex = String(index);
			fillPath.dataset.nodeHref = nodeHref;
			const firstLine = currentSvg.querySelector('.mindmap-line');
			if (firstLine) currentSvg.insertBefore(fillPath, firstLine);
			else currentSvg.appendChild(fillPath);
			
			currentSvg.appendChild(circle);
			
			console.log(`Hand-drawn circle ${index} created for ${node.textContent.trim()}`);
		});
		
		console.log('All hand-drawn circles created. Total SVG children:', currentSvg.children.length);
		const allImages = currentSvg.querySelectorAll('image');
		console.log('Circle images in SVG:', allImages.length);
		
		// Verify each image is actually in the DOM and visible
		allImages.forEach((img, idx) => {
			const href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
			console.log(`Image ${idx}: href="${href}", x=${img.getAttribute('x')}, y=${img.getAttribute('y')}, width=${img.getAttribute('width')}, height=${img.getAttribute('height')}, opacity=${img.getAttribute('opacity')}`);
			console.log(`  - In DOM:`, img.parentNode === currentSvg);
			console.log(`  - Computed display:`, window.getComputedStyle(img).display);
			console.log(`  - Computed visibility:`, window.getComputedStyle(img).visibility);
		});
	}


		// Mouse follow for pupils - ULTRA CONSERVATIVE fixed range
		function updatePupilPosition(e) {
			pupils.forEach(pupil => {
				const eye = pupil.parentElement;
				const eyeRect = eye.getBoundingClientRect();
				const eyeCenterX = eyeRect.left + eyeRect.width / 2;
				const eyeCenterY = eyeRect.top + eyeRect.height / 2;
				
				// FIXED small movement range - only 3 pixels maximum
				const maxMoveDistance = 3; // Fixed 3 pixel limit
				
				const deltaX = e.clientX - eyeCenterX;
				const deltaY = e.clientY - eyeCenterY;
				const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				
				// ULTRA CONSERVATIVE - pupils can only move 3 pixels maximum
				let moveX, moveY;
				if (distance <= maxMoveDistance) {
					// Mouse is within tiny safe zone
					moveX = deltaX;
					moveY = deltaY;
				} else {
					// Mouse is outside tiny safe zone - constrain to 3 pixel edge
					const angle = Math.atan2(deltaY, deltaX);
					moveX = Math.cos(angle) * maxMoveDistance;
					moveY = Math.sin(angle) * maxMoveDistance;
				}
				
				// Apply movement with ULTRA CONSERVATIVE bounds
				pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
			});
		}

		// Node hover effects
		nodes.forEach(node => {
			// BRAINFARTS is "under construction" on the Projects page: keep hover animations,
			// but prevent navigation so it is not clickable.
			node.addEventListener('click', function(e) {
				const href = (this.getAttribute('href') || '').toLowerCase();
				if (!href.includes('brainfarts')) return;
				// Allow normal browser behaviors (new tab, etc.)
				if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();
				e.stopPropagation();
			});

			node.addEventListener('mouseenter', function() {
				const href = (this.getAttribute('href') || '').toLowerCase();
				const hoverKey = ((this.dataset && this.dataset.hoverKey) ? this.dataset.hoverKey : href).toLowerCase();
				console.log('Hovering over:', href, 'hoverKey:', hoverKey);

				// TWISTER hover: spark animation over D&AD logo
				const badge = document.querySelector('.dandd-badge');
				if (badge) {
					if (hoverKey.includes('twister')) badge.classList.add('is-sparking');
					else badge.classList.remove('is-sparking');
				}

				// REPOP hover: star-burst animation over the Kravlinprisen text
				const kravlingBadge = document.querySelector('.kravling-nomineret-badge');
				if (kravlingBadge) {
					if (hoverKey.includes('repop')) kravlingBadge.classList.add('is-sparking');
					else kravlingBadge.classList.remove('is-sparking');
				}

				// KØ-BAJER hover: charcoal ray animation over the Kravlingprisen 2024 badge
				const kobajerKravling2024 = document.querySelector('.kobajer-kravling-2024-badge');
				if (kobajerKravling2024) {
					if (hoverKey.includes('kobajer')) kobajerKravling2024.classList.add('is-sparking');
					else kobajerKravling2024.classList.remove('is-sparking');
				}

				// Brain blush should appear ONLY when hovering BRAINFARTS
				if (brain) {
					if (hoverKey.includes('brainfarts')) brain.classList.add('is-blushing');
					else brain.classList.remove('is-blushing');
				}
				// Brain should fart ONLY when hovering BRAINFARTS
				if (hoverKey.includes('brainfarts')) startBrainFart();
				else stopBrainFart();

				// Make it clear the tab is clickable: pulse the matching hand-drawn circle frame
				const currentSvg = document.querySelector('.connecting-lines');
				const idx = this.dataset.nodeIndex;
				const nodeHref = (this.dataset.nodeHref || href).toLowerCase();
				const frame =
					(currentSvg && nodeHref && currentSvg.querySelector(`.hand-drawn-frame[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.hand-drawn-frame[data-node-index="${idx}"]`));
				const fill =
					(currentSvg && nodeHref && currentSvg.querySelector(`.frame-fill[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.frame-fill[data-node-index="${idx}"]`));
				const line =
					(currentSvg && nodeHref && currentSvg.querySelector(`.mindmap-line[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.mindmap-line[data-node-index="${idx}"]`));

				if (fill) fill.classList.add('is-hovered');

				if (frame) {
					frame.classList.add('is-hovered');
					// Extra explicit inline styling so the purple highlight shows even if CSS is overridden
					frame.style.opacity = '1';
					frame.style.filter = 'drop-shadow(0 0 16px rgba(118, 75, 162, 0.65)) drop-shadow(0 0 28px rgba(102, 126, 234, 0.55)) drop-shadow(0 10px 18px rgba(0,0,0,0.22)) brightness(1.08)';
				}

				// Ensure the hovered line is visually complete (above the purple fill)
				if (line && line.parentNode === currentSvg) {
					currentSvg.appendChild(line);
				}
				const condomAsset = document.querySelector('.condom-asset');
				const kornAsset = document.querySelector('.korn-asset');
				const kasketAsset = document.querySelector('.kasket-asset');
				const oldaseAsset = document.querySelector('.oldase-asset');
				const naturliAsset = document.querySelector('.naturli-asset');
				const dropsAsset = document.querySelector('.naturli-drops-asset');
				const twisterAsset = document.querySelector('.twister-asset');
				const ungeModUvAsset = document.querySelector('.unge-mod-uv-asset');
				
				// Different expressions and assets for different projects
				if (hoverKey.includes('durex')) {
					// Durex - show condom asset
					console.log('Durex hover detected, showing condom asset');
					if (condomAsset) {
						condomAsset.style.display = 'block';
						condomAsset.style.animation = 'condomAppear 0.5s ease-in-out forwards';
						console.log('Condom asset should be visible now');
					} else {
						console.log('Condom asset not found');
					}
				} else if (hoverKey.includes('byens-landhandel')) {
					// Byens Landhandel - show korn asset
					if (kornAsset) {
						kornAsset.style.display = 'block';
						kornAsset.style.opacity = '1';
						kornAsset.style.animation = 'kornRotateOnce 1s ease-in-out forwards';
					}
				} else if (hoverKey.includes('repop')) {
					// Repop - show kasket asset
					if (kasketAsset) {
						kasketAsset.style.display = 'block';
						kasketAsset.style.animation = 'kasketFall 0.8s ease-in-out forwards';
					}
				} else if (hoverKey.includes('kobajer')) {
					// Købajer - show øldåse asset
					if (oldaseAsset) {
						oldaseAsset.style.display = 'block';
						oldaseAsset.style.animation = 'oldaseAppear 0.5s ease-in-out forwards';
					}
				} else if (hoverKey.includes('naturli')) {
					// Naturli' - show bottle and drops
					if (naturliAsset) {
						naturliAsset.style.display = 'block';
						// Restart animation reliably on repeated hovers
						naturliAsset.style.animation = 'none';
						// Force reflow
						void naturliAsset.offsetHeight;
						naturliAsset.style.animation = 'naturliSqueeze3 2.2s ease-in-out forwards';
					}
					if (dropsAsset) {
						dropsAsset.style.display = 'block';
						// Restart animation reliably on repeated hovers
						dropsAsset.style.animation = 'none';
						// Force reflow
						void dropsAsset.offsetHeight;
						dropsAsset.style.animation = 'naturliDropsBurst3 2.2s ease-in-out forwards';
					}
				} else if (hoverKey.includes('twister')) {
					// Twister - show twister asset
					if (twisterAsset) {
						twisterAsset.style.display = 'block';
						twisterAsset.style.animation = 'twisterAppear 0.5s ease-in-out forwards';
					}
					// Tongue lick: left->right OVER icecream, then right->left UNDER icecream
					if (brain) {
						brain.dataset.twisterTongueActive = '1';
						startTwisterTongue();
					}
					// Playful expression
					if (mouth) {
						mouth.setAttribute('d', 'M35,58 Q50,63 65,58');
					}
				} else if (hoverKey.includes('unge-mod-uv')) {
					// Unge mod UV - show asset
					if (ungeModUvAsset) {
						ungeModUvAsset.style.display = 'block';
						ungeModUvAsset.style.animation = 'ungeModUvAppear 0.5s ease-in-out forwards';
					}
					// Happy expression
					if (mouth) {
						mouth.setAttribute('d', 'M35,58 Q50,65 65,58');
					}
				} else if (hoverKey.includes('brainfarts') || hoverKey.includes('project1')) {
					// BRAINFARTS - embarrassed expression
					if (mouth) {
						mouth.setAttribute('d', 'M35,58 Q50,55 65,58');
					}
				}
			});

			node.addEventListener('mouseleave', function() {
				const href = this.getAttribute('href');
				const currentSvg = document.querySelector('.connecting-lines');
				const idx = this.dataset.nodeIndex;
				const nodeHref = (this.dataset.nodeHref || (href || '')).toLowerCase();
				const frame =
					(currentSvg && nodeHref && currentSvg.querySelector(`.hand-drawn-frame[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.hand-drawn-frame[data-node-index="${idx}"]`));
				const fill =
					(currentSvg && nodeHref && currentSvg.querySelector(`.frame-fill[data-node-href="${nodeHref}"]`)) ||
					(currentSvg && idx && currentSvg.querySelector(`.frame-fill[data-node-index="${idx}"]`));

				if (fill) fill.classList.remove('is-hovered');

				if (frame) {
					frame.classList.remove('is-hovered');
					frame.style.filter = '';
					frame.style.opacity = '';
				}

				// Hide brain blush when leaving any tab
				if (brain) brain.classList.remove('is-blushing');
				// Stop farting when leaving
				stopBrainFart();
				// Stop D&AD sparks when leaving
				const badge = document.querySelector('.dandd-badge');
				if (badge) badge.classList.remove('is-sparking');
				// Stop Kravling stars when leaving
				const kravlingBadge = document.querySelector('.kravling-nomineret-badge');
				if (kravlingBadge) kravlingBadge.classList.remove('is-sparking');
				// Stop KØ-BAJER Kravling 2024 charcoal rays when leaving
				const kobajerKravling2024 = document.querySelector('.kobajer-kravling-2024-badge');
				if (kobajerKravling2024) kobajerKravling2024.classList.remove('is-sparking');
				// Stop Twister tongue on leave
				stopTwisterTongue();
				const condomAsset = document.querySelector('.condom-asset');
				const kornAsset = document.querySelector('.korn-asset');
				const kasketAsset = document.querySelector('.kasket-asset');
				const oldaseAsset = document.querySelector('.oldase-asset');
				const naturliAsset = document.querySelector('.naturli-asset');
				const dropsAsset = document.querySelector('.naturli-drops-asset');
				const twisterAsset = document.querySelector('.twister-asset');
				const ungeModUvAsset = document.querySelector('.unge-mod-uv-asset');
				
				// Hide all assets
				[condomAsset, kornAsset, kasketAsset, oldaseAsset, naturliAsset, dropsAsset, twisterAsset, ungeModUvAsset].forEach(asset => {
					if (asset) {
						asset.style.display = 'none';
						asset.style.animation = 'none';
					}
				});
				
				// Reset to normal expression
				if (mouth) {
					mouth.setAttribute('d', 'M38,58 Q50,61 62,58');
				}
			});
		});

		// Initialize
		// The red dots should look like the brain is blushing, so render them on the brain itself.
		createBrainBlush();
		createAssets();
		createTwisterTongues();

		// Ensure nodes are placed before drawing lines/frames.
		positionNodesPerfectCircle();
		createAndPositionDandDLogo();
		createAndPositionTwisterDandDLine();
		createAndPositionRepopKravlingLine();
		createAndPositionKravlingNomineretBadge();
		createAndPositionKobajerArrow();
		
		// Create connecting lines dynamically
		createConnectingLines();
		
		// Create hand-drawn frames around project tabs
		createHandDrawnFrames();
		
		document.addEventListener('mousemove', updatePupilPosition);
		
		// Recreate lines and frames on window resize
		window.addEventListener('resize', function() {
			setTimeout(() => {
				positionNodesPerfectCircle();
				createAndPositionDandDLogo();
				createAndPositionTwisterDandDLine();
				createAndPositionRepopKravlingLine();
				createAndPositionKravlingNomineretBadge();
				createAndPositionKobajerArrow();
				createConnectingLines();
				createHandDrawnFrames();
			}, 100);
		});

		// Mark as initialized to avoid duplicate event listeners on re-run.
		brain.dataset.animInit = '1';
		if (isPreview) {
			try {
				const container = document.querySelector('.brainstorm-container');
				if (container) container.classList.add('preview-ready');
			} catch {}
		}
	}

	// Initialize brain animations
	initBrainAnimations();

	// Re-run init when navigating to the projects section (e.g. clicking "projekter")
	window.addEventListener('hashchange', () => setTimeout(initBrainAnimations, 50));
	document.addEventListener('click', (e) => {
		const a = e.target && e.target.closest ? e.target.closest('a') : null;
		const href = a ? (a.getAttribute('href') || '') : '';
		if (href.toLowerCase().includes('projekter') || href.toLowerCase().includes('#projekter')) {
			setTimeout(initBrainAnimations, 50);
		}
	});
});

// Ensure lazy video init runs after DOM is ready
window.addEventListener('load', function () {
	const lazyContainers = document.querySelectorAll('.video-lazy');
	lazyContainers.forEach((container) => {
		if (container.getAttribute('data-bound') === 'true') return;
		container.setAttribute('data-bound', 'true');
		container.addEventListener('click', function () {
			const videoId = container.getAttribute('data-video-id');
			if (!videoId) return;
			const iframe = document.createElement('iframe');
			iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
			iframe.title = 'Twister Video';
			iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			iframe.referrerPolicy = 'strict-origin-when-cross-origin';
			iframe.style.position = 'absolute';
			iframe.style.inset = '0';
			iframe.style.width = '100%';
			iframe.style.height = '100%';
			iframe.style.border = '0';
			container.innerHTML = '';
			container.appendChild(iframe);
		});
	});
}); 

// Global corner page-turn handles (all pages).
// Uses simple drag-threshold navigation, and triggers existing click-based flip transitions when available.
(function initGlobalCornerPageTurnHandles() {
	try {
		// Never add handles inside iframes (preview/measure/reveal overlays).
		if (window.self !== window.top) return;
	} catch {
		return;
	}

	try {
		const qs = (window.location.search || '').toLowerCase();
		if (qs.includes('preview=1') || qs.includes('measure=1') || qs.includes('reveal=1')) return;
	} catch {}

	// If a page already injected its own handles (interactive), don't add duplicates.
	if (document.querySelector('.page-turn-handle--left') || document.querySelector('.page-turn-handle--right')) return;

	const DRAG_PX = Math.max(220, Math.min(520, Math.round(window.innerWidth * 0.32)));
	const THRESH = Math.round(DRAG_PX * 0.5); // only commit after passing the middle

	function normalizeFileName() {
		let p = '';
		try { p = (window.location.pathname || ''); } catch {}
		p = (p.split('?')[0] || '').toLowerCase();
		const parts = p.split('/').filter(Boolean);
		const last = parts.length ? parts[parts.length - 1] : '';
		return last || 'index.html';
	}

	// Linear reading order (no wrap-around):
	// Projekter is the start page, Kontakt is the end page.
	const order = ['projects.html', 'about.html', 'contact.html'];
	const cur = normalizeFileName();
	const idx = order.indexOf(cur);
	const prev = (idx > 0) ? order[idx - 1] : null;
	const next = (idx >= 0 && idx < order.length - 1) ? order[idx + 1] : null;

	function ensureHandle(side) {
		const el = document.createElement('div');
		el.className = `page-turn-handle page-turn-handle--${side}`;
		el.setAttribute('aria-hidden', 'true');
		el.dataset.target = (side === 'left') ? prev : next;
		document.body.appendChild(el);
		return el;
	}

	function triggerNav(targetFile) {
		if (!targetFile) return;
		try {
			const a = document.querySelector(`a[href="${CSS.escape(targetFile)}"]`);
			if (a) { a.click(); return; } // lets existing flip handlers run
		} catch {}
		try { window.location.href = targetFile; } catch {}
	}

	const left = prev ? ensureHandle('left') : null;
	const right = next ? ensureHandle('right') : null;

	// Bottom-left: pull to the RIGHT to go to prev.
	if (left) left.addEventListener('pointerdown', (e) => {
		if (!e || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		const startX = e.clientX;
		const onUp = (ev) => {
			window.removeEventListener('pointerup', onUp, true);
			window.removeEventListener('pointercancel', onUp, true);
			const dx = (ev && typeof ev.clientX === 'number') ? (ev.clientX - startX) : 0;
			if (dx >= THRESH) triggerNav(left.dataset.target);
		};
		window.addEventListener('pointerup', onUp, true);
		window.addEventListener('pointercancel', onUp, true);
	}, { passive: false });

	// Bottom-right: pull to the LEFT to go to next.
	if (right) right.addEventListener('pointerdown', (e) => {
		if (!e || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		const startX = e.clientX;
		const onUp = (ev) => {
			window.removeEventListener('pointerup', onUp, true);
			window.removeEventListener('pointercancel', onUp, true);
			const dx = (ev && typeof ev.clientX === 'number') ? (startX - ev.clientX) : 0;
			if (dx >= THRESH) triggerNav(right.dataset.target);
		};
		window.addEventListener('pointerup', onUp, true);
		window.addEventListener('pointercancel', onUp, true);
	}, { passive: false });
})();
