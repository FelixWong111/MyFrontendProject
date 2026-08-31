import type { ReactNode } from "react";
import { Card, Typography } from "antd";

import styles from "./SectionCard.module.css";

interface SectionCardProps{
    title:string;
    description?:string;
    extra?:ReactNode;
    children?:ReactNode;
    className?:string;
}
//相当于定义一个参数对象

export function SectionCard({
    title,
    description,
    extra,
    children,
    className
}:SectionCardProps){
    const mergedClassName = [styles.card, className].filter(Boolean).join(" ");
    return(
        <Card className={mergedClassName} variant="borderless">
            <div className={styles.headingRow}>
                <div>
                    <Typography.Title level={2} className={styles.title}>
                        {title}
                    </Typography.Title>
                    {description ? (
                        <Typography.Paragraph className={styles.description}>
                            {description}
                        </Typography.Paragraph>
                    ) : null} {/*JavaScript三元运算符。条件 ? 条件成立执行 : 条件不成立执行*/}
                </div>
                {extra ? <div className={styles.extra}>{extra}</div> : null}
            </div>
            {children}
        </Card>
    );
}