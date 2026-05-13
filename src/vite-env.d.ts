/// <reference types="vite/client" />

// WebGPU type declarations
interface Navigator {
  gpu: {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  };
}

interface GPURequestAdapterOptions {
  powerPreference?: "low-power" | "high-performance";
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

interface GPUDeviceDescriptor {
  requiredFeatures?: GPUFeatureName[];
  requiredLimits?: Record<string, number>;
  defaultQueue?: GPUQueueDescriptor;
}

interface GPUDevice {
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  queue: GPUQueue;
  destroy(): void;
}

interface GPUShaderModuleDescriptor {
  label?: string;
  code: string;
}

interface GPUShaderModule {
  getCompilationInfo(): Promise<GPUCompilationInfo>;
}

interface GPUComputePipelineDescriptor {
  label?: string;
  layout: GPUPipelineLayout | "auto";
  compute: GPUComputeStageDescriptor;
}

interface GPUComputeStageDescriptor {
  module: GPUShaderModule;
  entryPoint: string;
}

interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

interface GPUBindGroupLayout {
  // Internal type
}

interface GPUBindGroupLayoutDescriptor {
  label?: string;
  entries: Array<GPUBindGroupLayoutEntry>;
}

interface GPUBindGroupLayoutEntry {
  binding: number;
  visibility: number;
  buffer?: { type: "storage" | "read-only-storage" | "uniform" };
}

interface GPUBindGroup {
  // Internal type
}

interface GPUBindGroupDescriptor {
  label?: string;
  layout: GPUBindGroupLayout;
  entries: Array<GPUBindGroupEntry>;
}

interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBufferBinding | GPUTextureView | GPUSampler;
}

interface GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: number;
  size?: number;
}

interface GPUComputePassDescriptor {
  label?: string;
}

interface GPUComputePipelineLayout {
  label?: string;
}

interface GPUPipelineLayout {
  label?: string;
}

interface GPUCommandEncoder {
  beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
  copyBufferToBuffer(
    source: GPUBuffer,
    sourceOffset: number,
    destination: GPUBuffer,
    destinationOffset: number,
    size: number
  ): void;
  finish(): GPUCommandBuffer;
}

interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup | undefined, dynamicOffsets?: Uint32Array): void;
  dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
  end(): void;
  setLabel(label: string): void;
}

interface GPUCommandBuffer {
  // Internal type
}

interface GPUQueue {
  submit(commands: GPUCommandBuffer[]): void;
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBufferView, dataOffset?: number, size?: number): void;
  copyBufferToBuffer(
    source: GPUBuffer,
    sourceOffset: number,
    destination: GPUBuffer,
    destinationOffset: number,
    size: number
  ): void;
}

interface GPUBufferDescriptor {
  label?: string;
  size: number;
  usage: number;
  mappedAtCreation?: boolean;
}

interface GPUBuffer {
  mapAsync(mode: number, offset?: number, size?: number): Promise<void>;
  getMappedRange(size?: number): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}

interface GPUCompilationInfo {
  // Internal type
}

type GPUFeatureName = string;
type GPUSampler = unknown;
type GPURenderPipeline = unknown;
type GPUTextureView = unknown;
type GPUFeatureSet = Set<string>;

// Constants
declare const GPUShaderStage: {
  readonly VERTEX: number;
  readonly FRAGMENT: number;
  readonly COMPUTE: number;
};

declare const GPUBufferUsage: {
  readonly VERTEX: number;
  readonly INDEX: number;
  readonly UNIFORM: number;
  readonly STORAGE: number;
  readonly INDIRECT: number;
  readonly QUERY_RESOLVE: number;
  readonly COPY_SRC: number;
  readonly COPY_DST: number;
};

declare const GPUMapMode: {
  readonly READ: number;
  readonly WRITE: number;
};
