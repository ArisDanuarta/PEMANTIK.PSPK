1. **Brand Guidelines**: 
   - Update `PALETTE` to PSPK colors: `#102e50` (Navy), `#f2af3e` (Gold), `#a8281c` (Maroon), `#df632f` (Orange), `#0874aa` (Teal), `#8e2d3f` (Dark Red), `#f4b867` (Light Gold).
   - Use `fontFamily: "Lora, serif"` for titles and `fontFamily: "Inter, sans-serif"` for general text.
2. **Tidak Bulat (Organic Shapes)**:
   - Modify `blobPath` to generate a base ring of points, apply a noise/jitter function to their radii, and use a spline to draw the path. This guarantees a wobbly blob shape even if there's only 1 data point inside.
3. **Anti-Overlap (Jangan numpuk)**:
   - Increase collision radii: `.force("collide", forceCollide().radius(d => d.r + 35).iterations(4))`.
   - Add a stronger repulsive force `.force("charge", forceManyBody().strength(-400))`.
4. **Fix Bug Tampilan Blank saat Back**:
   - The SVG wasn't re-rendering because `selectedTag` wasn't in the dependency array of the overview `useEffect`. Add `selectedTag` so it redraws when returning from Level 1.
5. **Interactive**:
   - Ensure the nodes can be clicked/hovered easily. We can add a simple tooltip on hover. If full drag is requested, we can use React state or just keep the static force layout but with hover states (which already exist). I will stick to static-after-tick for performance, but add better CSS transitions and hover highlighting.
