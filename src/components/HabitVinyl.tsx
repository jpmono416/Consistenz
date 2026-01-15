/* ------------------------------------------------------------------ */
/* ---------------------------   TYPES   ---------------------------- */
/* ------------------------------------------------------------------ */
import {View,
    StyleSheet,
    Text,
    useWindowDimensions} from "react-native";
import Svg, {Line, Path, Text as SvgText} from "react-native-svg";
import { getDay } from 'date-fns';
import { getStatusColor, Status } from '@/utils/helpers';

export interface Habit {
    id: string;
    name: string;
    color?: string;
    // …any other fields you store
}

export type MonthData = Record<string, Record<number, Status>>; // habitId → day → status

interface Props {
    habits: Habit[];
    monthData: MonthData;
    daysInMonth: number;
    /** Date to display in center label */
    date?: Date;
    showHabitColorOnDone?: boolean;
}

/* ------------------------------------------------------------------ */
/* -------------------------   COMPONENT   -------------------------- */
/* ------------------------------------------------------------------ */
const HabitVinyl: React.FC<Props> = ({ habits, monthData, daysInMonth, date, showHabitColorOnDone = false }) => {
    const { width, height } = useWindowDimensions();
    const numHabits = habits.length;

    // detect Mondays for labels and boundary styling
    const displayDate = date || new Date();
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const mondayIndices = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
        if (getDay(new Date(year, month, d)) === 1) {
            mondayIndices.add(d - 1);
        }
    }

    if (numHabits === 0) {
        return <Text>No habits configured.</Text>;
    }

    /* ------------  dynamic sizing (max possible)  ------------ */
    const PADDING = 32;
    const LABEL_MARGIN_OUTER = 20; // space for labels outside outer ring
    const canvas = Math.min(width, height) - PADDING - 2 * LABEL_MARGIN_OUTER; // ensure labels fit
    const baseDiameter = 80;                                   // inner hole
    const laneWidth = 35;
    const maxNeededRadius = baseDiameter / 2 + numHabits * laneWidth;
    const scale = canvas / (maxNeededRadius * 2);              // shrink or stretch uniformly

    const scaledLane = laneWidth * scale;
    const scaledBaseDiameter = baseDiameter * scale;
    const totalR = scaledBaseDiameter / 2 + numHabits * scaledLane;
    const svgSize = (totalR + LABEL_MARGIN_OUTER) * 2;
    const center = svgSize / 2;

    const totalSweep = 270;            // ¾ circle
    const startOffset = -90;           // 12 o’clock

    const polar = (r: number, deg: number) => {
        const rad = ((deg + startOffset) * Math.PI) / 180;
        return {
            x: center + r * Math.cos(rad),
            y: center + r * Math.sin(rad),
        };
    };

    const sectorPath = (
        r0: number,
        r1: number,
        a0: number,
        a1: number,
    ) => {
        const p0 = polar(r1, a0);
        const p1 = polar(r1, a1);
        const p2 = polar(r0, a1);
        const p3 = polar(r0, a0);
        const large = a1 - a0 <= 180 ? 0 : 1;
        return [
            `M ${p0.x} ${p0.y}`,
            `A ${r1} ${r1} 0 ${large} 1 ${p1.x} ${p1.y}`,
            `L ${p2.x} ${p2.y}`,
            `A ${r0} ${r0} 0 ${large} 0 ${p3.x} ${p3.y}`,
            'Z',
        ].join(' ');
    };

    const anglePerDay = totalSweep / daysInMonth;
    const elements: React.ReactNode[] = [];

    /* ------------  radial day lines  ------------ */
    for (let i = 0; i <= daysInMonth; i += 1) {
        const a = anglePerDay * i;
        const pStart = polar(scaledBaseDiameter / 2, a);
        const pEnd = polar(totalR, a);
        const isWeek = i > 0 && i % 7 === 0;
        const isMondayLine = mondayIndices.has(i);
        elements.push(
            <Line
                key={`line-${i}`}
                x1={pStart.x}
                y1={pStart.y}
                x2={pEnd.x}
                y2={pEnd.y}
                stroke={isMondayLine ? '#FCC737' : 'rgba(255,255,255,0.5)'}
                strokeWidth={isMondayLine ? 2 : isWeek ? 1.5 : 0.75}
            />,
        );
    }

    /* ------------  habit/day wedges  ------------ */
    habits.forEach((habit, hIdx) => {
        const r0 = scaledBaseDiameter / 2 + hIdx * scaledLane;
        const r1 = r0 + scaledLane;

        for (let d = 0; d < daysInMonth; d += 1) {
            const dayNum = d + 1;
            const a0 = anglePerDay * d;
            const a1 = anglePerDay * (d + 1);
            const status = monthData[habit.id]?.[dayNum] ?? null;
            const defaultColor = getStatusColor(status);
            const fill = showHabitColorOnDone && status === 'done'
                ? (habit.color || defaultColor)
                : defaultColor;

            elements.push(
                <Path
                    key={`wedge-${hIdx}-${d}`}
                    d={sectorPath(r0, r1, a0, a1)}
                    fill={fill}
                    stroke="white"
                    strokeWidth={0.5}
                />
            );
        }
    });

    // X coordinate of first (vertical) day line and label margin
    const firstLineX = polar(scaledBaseDiameter / 2, 0).x;
    const LABEL_MARGIN = 8;
    // habit name labels: positioned at lane midpoints, left of first vertical line
    habits.forEach((habit, idx) => {
      const rCenter = scaledBaseDiameter / 2 + idx * scaledLane + scaledLane / 2;
      const labelY = polar(rCenter, 0).y;
      elements.push(
        <SvgText
          key={`label-${habit.id}`}
          x={firstLineX - LABEL_MARGIN}
          y={labelY}
          fill={habit.color ?? 'white'}
          fontSize={20}
          fontWeight="bold"
          textAnchor="end"
          alignmentBaseline="middle">
          {habit.name}
        </SvgText>
      );
    });

   /* ------------  Monday date labels  ------------ */
   for (let d = 1; d <= daysInMonth; d += 1) {
       if (mondayIndices.has(d - 1)) {
           const startAngle = anglePerDay * (d - 1);
           const midAngle = startAngle + anglePerDay / 2;
           const labelRadius = totalR + LABEL_MARGIN_OUTER;
           const pos = polar(labelRadius, midAngle);
           elements.push(
               <SvgText
                   key={`mondayLabel-${d}`}
                   x={pos.x}
                   y={pos.y}
                   fill="white"
                   fontSize={12}
                   textAnchor="middle"
                   alignmentBaseline="middle"
               >{d}</SvgText>
           );
       }
   }
    /* ------------  render  ------------ */
    return (
        <View style={styles.root}>
            <Svg width={svgSize} height={svgSize}>
                {elements}
                {/* month label -- do not delete this bit of commented out code below
                */}
                {/*
                <SvgText
                  x={center}
                  y={center}
                  fill="white"
                  fontSize={22}
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle">
                  {format(date || new Date(), 'MMMM yyyy')}
                </SvgText>
                */}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        overflow: 'visible',
    },
});

export default HabitVinyl;
