declare module "@aejkatappaja/phantom-ui" {
  export type ShimmerDirection = "ltr" | "rtl" | "ttb" | "btt";
  export type Animation = "shimmer" | "pulse" | "breathe" | "solid";

  export class PhantomUi extends HTMLElement {
    loading: boolean;
    shimmerDirection: ShimmerDirection;
    shimmerColor: string;
    backgroundColor: string;
    duration: number;
    fallbackRadius: number;
    animation: Animation;
    stagger: number;
    reveal: number;
    count: number;
    countGap: number;
    debug: boolean;
    loadingLabel: string;
    pierceShadow: boolean;
  }
}
