import type { HouseRecordTimelineNode, HouseRecordTimelineResponse } from '@shared/contracts/house-record';
import { Image, Text, View } from '@tarojs/components';
import Taro, { useDidHide, useDidShow, useUnload } from '@tarojs/taro';
import { useCallback, useRef, useState } from 'react';

import { fetchHouseRecordTimeline } from '@/shared/api/house-record';
import { frontendEnv } from '@/shared/config/env';
import { AppLayout } from '@/shared/ui/app-layout';

import { GrowthTree } from './components/GrowthTree';
import { resolveTimelineNavigation } from './timeline-navigation';

import './index.scss';

/** 将服务端相对头像地址转换为可访问地址。 */
function normalizeImageUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return serverBase + url;
  const uploadsIndex = url.indexOf('/uploads/');
  return uploadsIndex >= 0 ? serverBase + url.slice(uploadsIndex) : url;
}

/** 房屋实录成长树页面。 */
export default function HouseRecordTimelinePage() {
  const [timeline, setTimeline] = useState<HouseRecordTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const requestSequenceRef = useRef(0);
  const hasTimelineRef = useRef(false);

  /** 每次页面重新显示时读取最新成长节点，避免复用页面实例后仍展示旧数据。 */
  const refreshTimeline = useCallback(async () => {
    const rentalId = Taro.getCurrentInstance().router?.params.rentalId;
    const requestSequence = ++requestSequenceRef.current;
    if (!rentalId) {
      setFailed(true);
      setLoading(false);
      return;
    }

    // 首次进入显示加载态；已有内容刷新时保留树场景，避免页面闪烁。
    if (!hasTimelineRef.current) setLoading(true);
    try {
      const data = await fetchHouseRecordTimeline(rentalId);
      if (requestSequence !== requestSequenceRef.current) return;
      hasTimelineRef.current = true;
      setTimeline(data);
      setFailed(false);
    } catch {
      if (requestSequence !== requestSequenceRef.current) return;
      setFailed(true);
      void Taro.showToast({ title: '成长记录暂时无法打开', icon: 'none' });
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }, []);

  useDidShow(() => {
    setIsVisible(true);
    void refreshTimeline();
  });

  useDidHide(() => setIsVisible(false));

  /** 页面卸载后使仍在途的请求失效，阻止异步响应继续更新状态。 */
  useUnload(() => {
    requestSequenceRef.current += 1;
  });

  /** 根据上报状态和房主身份进入今日上报或当日快照。 */
  function handleSelectDate(node: HouseRecordTimelineNode) {
    if (!timeline) return;
    const target = resolveTimelineNavigation(timeline, node);
    if ('url' in target) {
      void Taro.navigateTo({ url: target.url });
    } else {
      void Taro.showToast({ title: target.message, icon: 'none' });
    }
  }

  if (loading) {
    return (
      <AppLayout mode="native" contentClassName="timeline-state">
        <Text className="timeline-state__text">正在唤醒这棵成长树...</Text>
      </AppLayout>
    );
  }

  if (failed || !timeline) {
    return (
      <AppLayout mode="native" contentClassName="timeline-state">
        <Text className="timeline-state__title">这棵成长树暂时没有回应</Text>
        <Text className="timeline-state__text">稍后再来看看屋檐下的新变化</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="list" contentClassName="timeline-page" safeAreaBottom={false}>
      <View className="timeline-author">
        {timeline.author.avatar ? (
          <Image className="timeline-author__avatar" src={normalizeImageUrl(timeline.author.avatar)} mode="aspectFill" />
        ) : (
          <View className="timeline-author__avatar timeline-author__avatar--fallback">
            <Text className="timeline-author__initial">
              {timeline.author.nickname.trim().slice(0, 1) || '屋'}
            </Text>
          </View>
        )}
        <View className="timeline-author__copy">
          <Text className="timeline-author__name">{timeline.author.nickname}</Text>
          <Text className="timeline-author__title">{timeline.title}</Text>
        </View>
      </View>

      <GrowthTree key={timeline.rentalId} nodes={timeline.nodes} isOwner={timeline.isOwner} isVisible={isVisible} onSelect={handleSelectDate} />
    </AppLayout>
  );
}
