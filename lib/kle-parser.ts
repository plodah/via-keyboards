import {
  Formatting,
  Cursor,
  ColorCount,
  Dimensions,
  KLEElem,
  Result
} from './types';

type InnerReduceState = Formatting &
  Dimensions & {cursor: Cursor; colorCount: ColorCount; res: Result[]};
type OuterReduceState = {
  cursor: Cursor;
  colorCount: ColorCount;
  prevFormatting: Formatting;
  res: Result[][];
};

export function parseKLE(kle: string): any {
  const kleArr = kle.split(',\n');
  return kleArr.map(row =>
    JSON.parse(
      row
        .replace(/\n/g, '\\n')
        .replace(/\\/g, '\\\\')
        .replace(/\"\\(?!,)/g, '\\\\')
        .replace(/([{,])([A-Za-z][0-9A-Za-z]?)(:)/g, '$1"$2"$3')
    )
  );
}

export function generateParsedKLE(kle: KLEElem[][]) {
  const parsedKLE = kle.reduce<OuterReduceState>(
    (prev: OuterReduceState, kle: KLEElem[]) => {
      const parsedRow = kle.reduce<InnerReduceState>(
        (
          {
            cursor: {x, y},
            size,
            marginX,
            marginY,
            res,
            c,
            t,
            colorCount
          }: InnerReduceState,
          n
        ) => {
          // Check if object and apply formatting
          if (typeof n !== 'string') {
            let obj: InnerReduceState = {
              size,
              marginX,
              marginY,
              colorCount,
              c,
              t,
              res,
              cursor: {x, y}
            };
            if (n.w > 1) {
              obj = {...obj, size: 100 * n.w};
            }
            if (typeof n.y === 'number') {
              obj = {
                ...obj,
                marginY: 100 * n.y,
                cursor: {...obj.cursor, y: y + n.y}
              };
            }
            if (typeof n.x === 'number') {
              obj = {
                ...obj,
                marginX: 100 * n.x,
                cursor: {...obj.cursor, x: x + n.x}
              };
            }
            if (typeof n.c === 'string') {
              obj = {...obj, c: n.c};
            }
            if (typeof n.t === 'string') {
              obj = {...obj, t: n.t};
            }
            return obj as InnerReduceState;
          } else if (typeof n === 'string') {
            const colorCountKey = `${c}:${t}`;
            const [row, col] = n.split(',').map(num => parseInt(num, 10));
            const newColorCount = {
              ...colorCount,
              [colorCountKey]:
                colorCount[colorCountKey] === undefined
                  ? 1
                  : colorCount[colorCountKey] + 1
            };
            const currKey = {
              c,
              t,
              size,
              marginX,
              marginY,
              row,
              col,
              x,
              y,
              w: size / 100
            };
            return {
              marginX: 0,
              marginY,
              size: 100,
              c,
              colorCount: newColorCount,
              t,
              cursor: {x: x + size / 100, y},
              res: [...res, currKey]
            };
          }
          return {
            marginX,
            marginY,
            size,
            c,
            t,
            res,
            colorCount,
            cursor: {x, y}
          };
        },
        {
          ...prev.prevFormatting,
          cursor: prev.cursor,
          colorCount: prev.colorCount,
          marginX: 0,
          marginY: 0,
          size: 100,
          res: []
        }
      );
      return {
        cursor: {x: 0, y: parsedRow.cursor.y + 1},
        colorCount: parsedRow.colorCount,
        prevFormatting: {c: parsedRow.c, t: parsedRow.t},
        res: [...prev.res, parsedRow.res]
      };
    },
    {
      cursor: {x: 0, y: 0},
      prevFormatting: {c: '#f5f5f5', t: '#444444'},
      res: [],
      colorCount: {}
    }
  );

  const {colorCount, res} = parsedKLE;
  const colorCountKeys = Object.keys(colorCount);
  colorCountKeys.sort((a, b) => colorCount[b] - colorCount[a]);
  if (colorCountKeys.length > 3) {
    console.error('Please correct layout:', parsedKLE);
  }

  const colorMap = {
    [colorCountKeys[0]]: 'alpha',
    [colorCountKeys[1]]: 'mod',
    [colorCountKeys[2]]: 'accent'
  };

  const keys = res.flatMap(row =>
    row.map(k => ({
      ...k,
      c: undefined,
      t: undefined,
      label: undefined,
      size: undefined,
      marginX: undefined,
      marginY: undefined,
      color: colorMap[`${k.c}:${k.t}`] || 'alpha'
    }))
  );

  return {keys};
}
