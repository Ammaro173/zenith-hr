export default function LoginBackground(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      fill="none"
      height="800"
      preserveAspectRatio="none"
      viewBox="0 0 1440 800"
      width="1440"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Login Background</title>
      <g clipPath="url(#clip0_60118_9483)">
        <path d="M1440 0H0v800h1440z" fill="#000" />
        <mask
          height="738"
          id="mask0_60118_9483"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width="482"
          x="0"
          y="68"
        >
          <path
            d="M0 459.05c71.43 71.355 156.585 156.428 157.748 157.5l188.325 188.701H465.66c40.178-124.125 3.015-265.538-114.03-382.583L0 68.615z"
            fill="#fff"
          />
        </mask>
        <g mask="url(#mask0_60118_9483)">
          <path
            d="m240.03-183.946-607.875 639.672 633.637 602.144 607.875-639.676z"
            fill="url(#paint0_linear_60118_9483)"
          />
        </g>
        <mask
          height="811"
          id="mask1_60118_9483"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
          width="1178"
          x="262"
          y="-5"
        >
          <path
            d="m262.59-4.75 419.737 419.745c79.41 79.403 101.048 142.088 67.62 242.67C735 702.628 728.655 760.528 738.472 805.25h338.498C951.36 678.32 854.197 578.398 839.197 558.155c-19.29-26.047-44.527-38.737-33.532-109.455 41.407-266.25-31.41-336.157-116.67-421.425-7.845-7.837-18.735-18.727-32.033-32.025zm852.6 0-3.9 8.46s-30.8 79.8-30.8 140.048c0 53.962-5.47 89.16 115.23 210.885 1.81 1.822 107.46 107.595 244.28 244.59v-384.66L1221.91-4.75z"
            fill="#fff"
          />
        </mask>
        <g mask="url(#mask1_60118_9483)">
          <path
            d="M821.307-592.657-141.876 420.908 881.296 1393.22 1844.48 379.655z"
            fill="url(#paint1_linear_60118_9483)"
          />
        </g>
      </g>
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint0_linear_60118_9483"
          x1="-322.899"
          x2="1396.51"
          y1="-110.15"
          y2="1523.79"
        >
          <stop stopColor="#fff" />
          <stop offset="0.15" stopColor="#BDBDBD" />
          <stop offset="0.31" stopColor="#838383" />
          <stop offset="0.45" stopColor="#545454" />
          <stop offset="0.59" stopColor="#2F2F2F" />
          <stop offset="0.72" stopColor="#151515" />
          <stop offset="0.83" stopColor="#050505" />
          <stop offset="0.92" />
          <stop offset="1" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint1_linear_60118_9483"
          x1="-18.874"
          x2="1700.53"
          y1="-430.018"
          y2="1203.92"
        >
          <stop stopColor="#fff" />
          <stop offset="0.15" stopColor="#BDBDBD" />
          <stop offset="0.31" stopColor="#838383" />
          <stop offset="0.45" stopColor="#545454" />
          <stop offset="0.59" stopColor="#2F2F2F" />
          <stop offset="0.72" stopColor="#151515" />
          <stop offset="0.84" stopColor="#050505" />
          <stop offset="0.93" />
          <stop offset="1" />
        </linearGradient>
        <clipPath id="clip0_60118_9483">
          <path d="M0 0h1440v800H0z" fill="#fff" />
        </clipPath>
      </defs>
    </svg>
  );
}
