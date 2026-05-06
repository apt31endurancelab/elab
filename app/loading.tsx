export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <svg
        viewBox="0 0 32 22"
        className="h-28 w-auto sm:h-32"
        aria-label="Cargando"
        role="status"
      >
        <g fill="white">
          <rect x="2" y="4.8" height="1.3" rx="0.65" width="6">
            <animate
              attributeName="width"
              values="4;7.5;4"
              dur="5.5s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
            />
            <animate
              attributeName="opacity"
              values="0.45;0.8;0.45"
              dur="5.5s"
              repeatCount="indefinite"
            />
          </rect>
          <rect x="0" y="10.35" height="1.3" rx="0.65" width="9">
            <animate
              attributeName="width"
              values="8;11;8"
              dur="7s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
            />
            <animate
              attributeName="opacity"
              values="0.65;0.95;0.65"
              dur="7s"
              repeatCount="indefinite"
            />
          </rect>
          <rect x="3" y="15.9" height="1.3" rx="0.65" width="5">
            <animate
              attributeName="width"
              values="3;5.5;3"
              dur="6.5s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
            />
            <animate
              attributeName="opacity"
              values="0.35;0.7;0.35"
              dur="6.5s"
              repeatCount="indefinite"
            />
          </rect>
        </g>

        <path
          d="M 32 11 a 10 10 0 1 0 -20 0 a 10 10 0 1 0 20 0 M 28.5 11 a 6.5 6.5 0 1 1 -13 0 a 6.5 6.5 0 1 1 13 0"
          fill="white"
          fillRule="evenodd"
        />

        <g transform="translate(22 11)">
          <g>
            <polygon points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1" fill="white" />
            <polygon
              points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1"
              fill="white"
              transform="rotate(72)"
            />
            <polygon
              points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1"
              fill="white"
              transform="rotate(144)"
            />
            <polygon
              points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1"
              fill="white"
              transform="rotate(216)"
            />
            <polygon
              points="-0.55,-1.7 0.55,-1.7 1.2,-6.1 -1.2,-6.1"
              fill="white"
              transform="rotate(288)"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </g>
          <circle r="1.9" fill="white" />
        </g>
      </svg>
    </div>
  )
}
