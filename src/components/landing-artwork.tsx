type ArtworkId = "mona" | "starry" | "scream" | "pearl" | "wave" | "clocks";

/** Small, self-contained illustrations inspired by the paintings' signature details. */
export function LandingArtwork({ id, title }: { id: ArtworkId; title: string }) {
  return <svg viewBox="0 0 300 380" role="img" aria-label={title} className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id={`${id}-skin`} x2="1" y2=".3"><stop stopColor="#71503a"/><stop offset=".45" stopColor="#e2bf87"/><stop offset="1" stopColor="#b88b59"/></linearGradient>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#799c9c"/><stop offset="1" stopColor="#d2c59a"/></linearGradient>
      <radialGradient id={`${id}-night`}><stop stopColor="#315f91"/><stop offset="1" stopColor="#102444"/></radialGradient>
      <filter id={`${id}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".13"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
    </defs>
    <g filter={`url(#${id}-grain)`}>
      {id === "mona" && <>
        <path fill={`url(#${id}-sky)`} d="M0 0h300v380H0z"/>
        <path fill="#698479" d="m0 130 30-35 16 16 30-40 20 45 25-18 27 46 32-27 25 12 34-52 21 35 40-29v120H0z"/>
        <path fill="#466958" d="m0 177 50-25 30 12 54-8 45 20 55-36 66 20v220H0z"/>
        <path d="M290 156c-90 35 10 42-60 57s25 25-48 50" fill="none" stroke="#b0aa7d" strokeWidth="8"/>
        <path d="M0 245h70m-65-7h65m-54 0v17m17-17v15m17-15v12" stroke="#918969" strokeWidth="3"/>
        <path fill="#30271f" d="M78 217C53 166 67 73 126 64c75-15 107 52 94 125l-16 79z"/>
        <path fill={`url(#${id}-skin)`} d="m126 172-5 42 43 27 27-33-21-48z"/>
        <path fill={`url(#${id}-skin)`} d="M104 107c9-39 62-40 78-1 12 30 0 82-30 87-28 1-48-38-48-86z"/>
        <path d="M108 125q14-9 25 0m15-1q14-8 25 1" fill="none" stroke="#6a5039" strokeWidth="3"/>
        <path d="m112 128 18 1m22 0 17-1" stroke="#302b23" strokeWidth="2"/>
        <path d="m144 126-6 26 11 3" fill="none" stroke="#aa8057" strokeWidth="2"/>
        <path d="M132 167q15 7 29-2" fill="none" stroke="#80583f" strokeWidth="2"/>
        <path fill="#263b31" d="M43 380 49 273q4-52 66-73l34 30 37-30q51 15 66 81l12 99z"/>
        <path d="m114 202 35 38 37-40m-77 18 39 35 43-36m-92 63 19 63m97-76-13 75" fill="none" stroke="#8a7850" strokeWidth="4"/>
        <path fill="#493e2b" d="M49 293q43-28 70 13l100 28-4 46H43z"/>
        <path fill={`url(#${id}-skin)`} d="M94 302q38-7 67 12l43 11q13 10-8 12l-65-10-44-2q-18-14 7-23z"/>
        <path fill="#cfac7b" d="m183 309-35 19-40 13q-11 7 3 11l50-9 40-18z"/>
        <path d="m117 313 37 9m-39-3 35 9m-28 16 29-9" stroke="#ac8358" fill="none"/>
      </>}
      {id === "starry" && <>
        <path fill={`url(#${id}-night)`} d="M0 0h300v380H0z"/>
        <g fill="none" strokeLinecap="round">
          <path d="M-10 148C40 84 166 102 158 153s-80 22-54-5 76-3 102 19 66 9 107-14" stroke="#527fa4" strokeWidth="29"/>
          <path d="M-10 143C40 90 155 106 149 151s-66 18-40-4 66 1 99 20 67 5 100-13" stroke="#a1bfc1" strokeWidth="6"/>
          <path d="M-10 160C49 109 139 113 138 148s-45 10-24-3 59 13 87 27 65 21 110-2M-10 180c72-40 104-1 160 20s100 4 160-12M5 60q100-28 186 8" stroke="#648fba" strokeWidth="4"/>
          <path d="M0 263q57-65 110-30t87 5 110-17" stroke="#557b9b" strokeWidth="20"/>
        </g>
        <g fill="#f1cc68" stroke="#baa755" strokeWidth="6">{[[36,45,10],[92,65,7],[165,32,9],[206,109,8],[52,203,7],[270,181,7],[259,58,24]].map(([cx,cy,r])=><circle key={cx} cx={cx} cy={cy} r={r}/>)}</g>
        <path d="M265 34q-22 23 13 40-36 3-37-19t24-21" fill="#ffdd78"/>
        <path d="m0 293 56-36 60 21 45-26 62 20 77-21v129H0z" fill="#233c48"/>
        <g fill="#8396a0" stroke="#152d41" strokeWidth="3">{[99,130,179,211,252,276].map((x,i)=><path key={x} d={`m${x} ${310+i%2*14} 14-15 14 15v32h-28z`}/>)}</g>
        <path d="m153 347 3-61 8-33 7 34 3 60z" fill="#a0a5a1" stroke="#193042" strokeWidth="3"/>
        <g stroke="#e8c779" strokeWidth="4"><path d="M107 321v8m32-3v8m49-13v8m32 2v8m40-19v8"/></g>
        <path fill="#122d2b" stroke="#344b37" strokeWidth="3" d="M27 380c-13-35 9-62 4-95s-8-39 4-66 7-43 15-79c6 43 20 51 17 81s19 45 12 76 20 55 19 83z"/>
        <path d="M49 195q-7 89 13 175m-18-70-6 65m31-98 12 94" fill="none" stroke="#526044" strokeWidth="3"/>
      </>}
      {id === "scream" && <>
        <path fill="#d88b55" d="M0 0h300v380H0z"/>
        <g fill="none" strokeWidth="16"><path d="M-20 18c100 100 168-23 340 61M-20 60c100 100 180-15 340 67M-20 105c100 88 180-13 340 65" stroke="#b74832"/><path d="M-20 41c120 91 190-10 340 61M-20 86c100 85 180-10 340 65" stroke="#f4ba6f"/></g>
        <path fill="#355967" d="M300 156q-134-40-182 32t-92 70l274 122z"/>
        <path d="M300 188q-151-51-159 12t143 64M300 207q-112-27-115 0t115 35" fill="none" stroke="#92a49a" strokeWidth="8"/>
        <path fill="#90634c" d="m0 191 300 177v12H0z"/>
        <path d="m0 210 300 170M0 254l214 126M0 294l140 86M42 229v45m49-14v46" stroke="#382f2d" strokeWidth="7"/>
        <path d="m18 219 5-64 10-1 11 80m10 5 1-67 10 1 15 82" stroke="#292e31" strokeWidth="9" fill="none"/>
        <path fill="#343330" d="M105 380q-6-54 21-97l-2-50 66 4 8 53q-15 36 1 90z"/>
        <path fill="#d7c49a" stroke="#867258" strokeWidth="3" d="M127 191c-2-42 52-50 62-12 12 36-15 49-18 77-3 15-18 14-22 1-2-25-23-40-22-66z"/>
        <path d="m137 191 13 4m13-3 13-5" stroke="#49473b" strokeWidth="7" strokeLinecap="round"/>
        <ellipse cx="158" cy="230" rx="10" ry="19" fill="#453e32"/>
        <path d="m119 292 9-43-10-35q-4-14 3-14l17 41-3 35m55 21-4-49 11-36q3-13-4-13l-18 44 1 32" fill="#ceb58b" stroke="#8d7959" strokeWidth="3"/>
      </>}
      {id === "pearl" && <>
        <path fill="#111c1a" d="M0 0h300v380H0z"/>
        <path fill="#9a713e" d="M36 380q-8-77 66-108l77-22q75 31 97 130z"/>
        <path d="m112 277 37 36 54-42-18-23z" fill="#ede0b9"/>
        <path d="m128 234-5 42 29 26 33-45-19-40z" fill={`url(#${id}-skin)`}/>
        <path fill="#d7b25c" d="m166 70 57 16 10 166-30-20-12-124z"/>
        <path d="m209 108 10 112m-16-107 9 84" stroke="#967037" strokeWidth="5"/>
        <path fill={`url(#${id}-skin)`} d="M103 128c35-39 82-10 87 19l-4 33 18 20-18 8c1 27-14 47-38 47-33-3-63-38-60-73z"/>
        <path fill="#345c77" d="M69 164C59 73 138 39 187 81l14 42-33 6q-46-36-99 35z"/>
        <path fill="#6d9cb4" d="M80 132q25-69 94-50l-12 17q-48-11-82 33"/>
        <path d="M157 160q15-9 27 1l-12 6z" fill="#f7ead1"/>
        <ellipse cx="174" cy="161" rx="4" ry="5" fill="#27302c"/><circle cx="175" cy="159" r="1.3" fill="white"/>
        <path d="m181 169-5 23 10 4m-17 24q10-7 20-1-7 13-18 6" fill="#ad6555"/>
        <path d="M119 203q-14-16-14 4l10 15" fill="none" stroke="#98704c" strokeWidth="4"/>
        <path d="m116 221 1 14" stroke="#d5c398" strokeWidth="2"/>
        <ellipse cx="117" cy="244" rx="10" ry="14" fill="#a6a9a0"/>
        <path d="M111 238q-3 12 4 14" stroke="#fff7df" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <path d="m60 361 41-47m108-13 37 64" stroke="#b98d53" strokeWidth="6"/>
      </>}
      {id === "wave" && <>
        <path fill="#e9dbc0" d="M0 0h300v380H0z"/>
        <path fill="#a6bcc0" d="M0 196h300v184H0z"/>
        <path fill="#345570" d="m171 262 45-66 46 66z"/><path fill="#f5ebd4" d="m199 220 17-24 19 27-13-5-7 5-6-7z"/>
        <path fill="#173f60" d="M0 320V93C77 22 188 97 174 172c-4 29-26 43-49 47 36-40 2-77-32-48-33 29 12 72 38 102 39 44 106 41 169 9v98H0z"/>
        <path fill="#4f8399" d="M0 139C66 63 156 112 148 164c-47-56-99-12-76 45 28 69 92 114 228 88v83H0z"/>
        <path fill="#f7f0db" d="M0 109c48-50 113-45 151-4l14 25-24-7 12 24-23-9 9 26-20-15-6 23-12-15-14 16-12-7 5-21 21-14-6-13-24 4-17 20-15-2-2-16-18 8-24 39-17-4 6-31-19 8z"/>
        <g fill="none" stroke="#dce7da" strokeWidth="5"><path d="M0 204q15-72 51-56M0 244q30-70 65-14t100 84 135-2M0 278q33-50 63-12t89 68 148-9M0 318q28-35 72 0t106 34 122-15"/></g>
        <g fill="#d8bb83" stroke="#694d33" strokeWidth="3"><path d="m72 283 152 55-20 9-118-40z"/><path d="m159 260 141 26v16l-128-27z"/></g>
        <g fill="#173f60">{[91,111,131,151,171,191].map((x)=><ellipse key={x} cx={x} cy={290+(x-91)*.36} rx="6" ry="4"/>)}</g>
        <g fill="#fbf5e4">{[[17,85],[36,75],[65,74],[88,78],[113,89],[137,105],[31,189],[55,206],[80,243],[113,273],[206,314],[255,301]].map(([cx,cy])=><circle key={cx} cx={cx} cy={cy} r="3"/>)}</g>
      </>}
      {id === "clocks" && <>
        <path fill="#d3bd82" d="M0 0h300v380H0z"/>
        <path fill="#82aaa8" d="M0 90h300v75H0z"/>
        <path fill="#a57643" d="m212 139 28-61 27-10 10 25 23-10v90z"/>
        <path fill="#63533d" d="M0 161q123-23 300 14v205H0z"/>
        <path fill="#b69a68" d="M0 253q70-14 132 15t168-10v122H0z"/>
        <path fill="#bda87e" d="M0 211h109v100H0z"/><path fill="#4c3f2c" d="m109 211 32 34v89l-32-23z"/>
        <path d="M64 213 59 98m3 41 42-26 28 6m-70-1-22-19" fill="none" stroke="#403e2e" strokeWidth="8" strokeLinecap="round"/>
        <path fill="#d7cbb0" d="M125 294q15-62 59-40l25 31 39 26q-56 4-71 41-41-7-52-58"/>
        <path d="M150 295q19-8 27 6m-32-1 24 5" fill="none" stroke="#70573d" strokeWidth="3"/>
        <path fill="#7fa6b6" stroke="#d7bc73" strokeWidth="5" d="M48 203c42-23 72 1 61 22-10 16-2 48-16 55-24 11-20-42-31-47-22 4-40-15-14-30z"/>
        <path fill="#acc4c3" stroke="#d3b66b" strokeWidth="5" d="M102 118q29-20 39 5l-5 41q-19 14-21-10l-1-17q-27 2-12-19z"/>
        <path fill="#adc5c9" stroke="#d0b676" strokeWidth="5" d="M168 272q20-21 40-4l17 42q-10 18-27 2l-11-20q-23 0-19-20z"/>
        <g fill="none" stroke="#303f42" strokeWidth="2"><path d="m70 211 6 12 19-8m25-90 4 12 8-7m51 144 12 7 7-9"/><path d="m44 213 6 3m50-8-4 5m-12 48 7-1m11-134 6 1m25 28-5-1m43 123 6 1m32 25-5 2"/></g>
        <ellipse cx="37" cy="256" rx="27" ry="16" fill="#b96c37" stroke="#573e2c" strokeWidth="3"/>
        <g stroke="#362e26" strokeWidth="2">{[23,33,43,50].map(x=><path key={x} d={`m${x} 250 4 7m-6-3 9-2m-5 1-3 7`}/>)}</g>
      </>}
    </g>
  </svg>;
}
