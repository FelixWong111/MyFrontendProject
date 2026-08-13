import { createBrowserRouter, Navigate } from "react-router-dom";  //从React Router库中导入createBrowserRouter和Navigate组件，用于创建浏览器路由和导航功能
import { AppShell } from "@/shared/components/AppShell/AppShell";  //一些不会改变的组件，放在shared目录下，供整个应用共享使用
import { appConfig } from "@/shared/config/appConfig";             //导入应用配置对象appConfig，包含应用的名称、默认招标ID
import { AnnouncementPage } from "@/pages/announcement/ui/AnnouncementPage";//导入招标详情页面组件TenderDetailPage，用于显示特定招标的详细信息
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";//导入404页面组件NotFoundPage，用于处理未匹配的路由请求

export const router = createBrowserRouter([ //使用createBrowserRouter函数创建浏览器路由对象router,该函数接收一个数组，数组中每个对象表示一个路由规则
    {
        element:(  //element是react router中定义的路由规则的属性之一，表示该路由对应的组件元素
            <AppShell>
                <AnnouncementPage />
            </AppShell>    //<AppShell>组件包裹<AnnouncementPage />组件，提供应用的整体布局和样式
        ),
        path: "/tender/:tenderId",
    },
    {
        element:(
            <Navigate
                to={`/tender/${encodeURIComponent(appConfig.defaultTenderId)}`}  //用反引号`因为要嵌入变量，若是单引号会直接当成字符串
                replace   //替换浏览记录（因为'/'没有意义），避免用户点击浏览器的后退按钮时返回到'/'，而是直接跳转到默认招标ID的详情页
            />
        ),
        path: "/",
    },
    {
        path: "*",//匹配所有未定义的路由路径，通常用于处理404页面
        element:(
            <AppShell>
                <NotFoundPage />
            </AppShell>
        ),
    },
]);