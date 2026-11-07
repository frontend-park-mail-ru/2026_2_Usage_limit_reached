import { requireElement } from '../../utils/helpers/dom.ts';
import {
  CROP_DIAMETER,
  CROP_HEIGHT,
  CROP_WIDTH,
  DIM_ALPHA,
  OUTPUT_SIZE,
  RING_WIDTH,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from './avatarCropper.constants.ts';

/** Обрезка аватара по кругу. */
export class AvatarCropper {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly range: HTMLInputElement;
  private readonly zoomOutButton: HTMLButtonElement;
  private readonly zoomInButton: HTMLButtonElement;
  private readonly onPointerDown: (event: PointerEvent) => void;
  private readonly onPointerMove: (event: PointerEvent) => void;
  private readonly onPointerUp: (event: PointerEvent) => void;
  private readonly onRangeInput: () => void;
  private readonly onZoomOut: () => void;
  private readonly onZoomIn: () => void;
  private image: HTMLImageElement | null = null;
  private zoom = ZOOM_MIN;
  private offsetX = 0;
  private offsetY = 0;
  private pointerX = 0;
  private pointerY = 0;

  /**
   * @param root
   */
  constructor(root: HTMLElement) {
    this.canvas = requireElement<HTMLCanvasElement>(root, '.avatar-cropper__canvas');
    this.range = requireElement<HTMLInputElement>(root, '.avatar-cropper__range');
    this.zoomOutButton = requireElement<HTMLButtonElement>(root, '[data-zoom-out]');
    this.zoomInButton = requireElement<HTMLButtonElement>(root, '[data-zoom-in]');

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D is not supported');
    }
    this.context = context;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = CROP_WIDTH * ratio;
    this.canvas.height = CROP_HEIGHT * ratio;
    this.context.scale(ratio, ratio);

    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
    this.onPointerUp = this.handlePointerUp.bind(this);
    this.onRangeInput = () => this.setZoom(Number(this.range.value));
    this.onZoomOut = () => this.setZoom(this.zoom - ZOOM_STEP);
    this.onZoomIn = () => this.setZoom(this.zoom + ZOOM_STEP);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.range.addEventListener('input', this.onRangeInput);
    this.zoomOutButton.addEventListener('click', this.onZoomOut);
    this.zoomInButton.addEventListener('click', this.onZoomIn);
  }

  /**
   * Загружает фото.
   * @param file
   * @throws {Error}
   */
  async load(file: Blob): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      this.image = image;
    } finally {
      URL.revokeObjectURL(url);
    }
    this.zoom = ZOOM_MIN;
    this.offsetX = 0;
    this.offsetY = 0;
    this.setZoom(ZOOM_MIN);
  }

  /**
   * Квадрат под кругом в PNG.
   * @throws {Error}
   */
  toBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const output = document.createElement('canvas');
      output.width = OUTPUT_SIZE;
      output.height = OUTPUT_SIZE;
      const context = output.getContext('2d');
      if (!this.image || !context) {
        reject(new Error('Nothing to crop'));
        return;
      }
      const size = CROP_DIAMETER / this.scale;
      const x = (this.image.naturalWidth - size) / 2 - this.offsetX / this.scale;
      const y = (this.image.naturalHeight - size) / 2 - this.offsetY / this.scale;
      context.drawImage(this.image, x, y, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      output.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export failed'));
        }
      }, 'image/png');
    });
  }

  /** Сбрасывает фото. */
  reset(): void {
    this.image = null;
    this.zoom = ZOOM_MIN;
    this.offsetX = 0;
    this.offsetY = 0;
    this.setZoom(ZOOM_MIN);
  }

  /** Снимает обработчики. */
  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.range.removeEventListener('input', this.onRangeInput);
    this.zoomOutButton.removeEventListener('click', this.onZoomOut);
    this.zoomInButton.removeEventListener('click', this.onZoomIn);
  }

  /** Масштаб фото на холсте. */
  private get scale(): number {
    if (!this.image) {
      return 1;
    }
    return (CROP_DIAMETER / Math.min(this.image.naturalWidth, this.image.naturalHeight)) * this.zoom;
  }

  /**
   * Меняет масштаб.
   * @param value
   */
  private setZoom(value: number): void {
    const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    this.offsetX *= zoom / this.zoom;
    this.offsetY *= zoom / this.zoom;
    this.zoom = zoom;
    this.range.value = String(zoom);
    this.range.style.setProperty('--fill', `${((zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100}%`);
    this.clampOffset();
    this.draw();
  }

  /** Не даёт фото открыть край круга. */
  private clampOffset(): void {
    if (!this.image) {
      return;
    }
    const maxX = (this.image.naturalWidth * this.scale - CROP_DIAMETER) / 2;
    const maxY = (this.image.naturalHeight * this.scale - CROP_DIAMETER) / 2;
    this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));
    this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));
  }

  /** Рисует холст. */
  private draw(): void {
    const context = this.context;
    context.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT);
    if (!this.image) {
      return;
    }
    const width = this.image.naturalWidth * this.scale;
    const height = this.image.naturalHeight * this.scale;
    const x = CROP_WIDTH / 2 + this.offsetX - width / 2;
    const y = CROP_HEIGHT / 2 + this.offsetY - height / 2;

    context.globalAlpha = DIM_ALPHA;
    context.drawImage(this.image, x, y, width, height);
    context.globalAlpha = 1;

    context.save();
    this.circlePath();
    context.clip();
    context.drawImage(this.image, x, y, width, height);
    context.restore();

    this.circlePath();
    context.lineWidth = RING_WIDTH;
    context.strokeStyle = '#ffffff';
    context.stroke();
  }

  /** Контур круга. */
  private circlePath(): void {
    this.context.beginPath();
    this.context.arc(CROP_WIDTH / 2, CROP_HEIGHT / 2, CROP_DIAMETER / 2, 0, Math.PI * 2);
  }

  /**
   * Начало перетаскивания.
   * @param event
   */
  private handlePointerDown(event: PointerEvent): void {
    if (!this.image) {
      return;
    }
    this.canvas.setPointerCapture(event.pointerId);
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.canvas.addEventListener('pointermove', this.onPointerMove);
  }

  /**
   * Перетаскивание.
   * @param event
   */
  private handlePointerMove(event: PointerEvent): void {
    const ratio = CROP_WIDTH / this.canvas.clientWidth;
    this.offsetX += (event.clientX - this.pointerX) * ratio;
    this.offsetY += (event.clientY - this.pointerY) * ratio;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.clampOffset();
    this.draw();
  }

  /**
   * Конец перетаскивания.
   * @param event
   */
  private handlePointerUp(event: PointerEvent): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  }
}
