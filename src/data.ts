const histogram_linear: number[] = [
  828,      1032,      1103,      1359,      1595,      1968,
  2387,      2770,      3320,      3983,      4635,      5685,
  6940,      8443,     10355,     12843,     15937,     19971,
 26125,     34027,     45493,     61701,     89891,    140287,
262260,    626851,   1772805,   5039039,  12644037,  26084941,
42929308, 186933087,  55915043,  44309575,  28422855,  15646304,
8158965,   4468679,   2687245,   1764246,   1231380,    895686,
673114,    522549,    415265,    336105,    275764,    230239,
195835,    168619,    147392,    131195,    116858,    105353,
 95443,     86416,     80692,     75186,     70681,     67353,
 64011,     60765,     57701
];

export const histogram: number[] = histogram_linear.map(Math.log10);

export const edges: number[] = [
  -2000.        , -1936.50793651, -1873.01587302, -1809.52380952,
  -1746.03174603, -1682.53968254, -1619.04761905, -1555.55555556,
  -1492.06349206, -1428.57142857, -1365.07936508, -1301.58730159,
  -1238.0952381 , -1174.6031746 , -1111.11111111, -1047.61904762,
   -984.12698413,  -920.63492063,  -857.14285714,  -793.65079365,
   -730.15873016,  -666.66666667,  -603.17460317,  -539.68253968,
   -476.19047619,  -412.6984127 ,  -349.20634921,  -285.71428571,
   -222.22222222,  -158.73015873,   -95.23809524,   -31.74603175,
     31.74603175,    95.23809524,   158.73015873,   222.22222222,
    285.71428571,   349.20634921,   412.6984127 ,   476.19047619,
    539.68253968,   603.17460317,   666.66666667,   730.15873016,
    793.65079365,   857.14285714,   920.63492063,   984.12698413,
   1047.61904762,  1111.11111111,  1174.6031746 ,  1238.0952381 ,
   1301.58730159,  1365.07936508,  1428.57142857,  1492.06349206,
   1555.55555556,  1619.04761905,  1682.53968254,  1746.03174603,
   1809.52380952,  1873.01587302,  1936.50793651,  2000.         
];

let center_values: number[] = [];

for (let i = 0; i < edges.length - 1; i++) {
  center_values.push((edges[i] + edges[i+1]) / 2);
}

export const centers = center_values;