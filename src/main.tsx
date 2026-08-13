import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "antd/dist/reset.css";//在node_modules中引入antd的css样式
import './app/styles/global.css';//在ai项目中是global.css
import "dayjs/locale/zh-cn";//引入dayjs的中文包

import { RootApp} from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { AppProviders } from "./app/providers/AppProviders";

function bootstrap():void{ //bootstrap函数用于启动应用，没有返回值（返回值为void）
  const rootElement = document.getElementById('root');
  if(!rootElement){          //若rootElement不存在，则抛出错误
    throw new Error("未找到应用根节点");  
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AppProviders>
          <RootApp />
        </AppProviders>
      </ErrorBoundary>
    </StrictMode>
  );
}

void bootstrap();