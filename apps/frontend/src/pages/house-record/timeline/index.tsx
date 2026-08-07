import type { HouseRecordTimelineNode, HouseRecordTimelineResponse } from '@shared/contracts/house-record';
import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { fetchHouseRecordTimeline } from '@/shared/api/house-record';
import { frontendEnv } from '@/shared/config/env';
import { AppLayout } from '@/shared/ui/app-layout';

import { GrowthTree } from './components/GrowthTree';

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

  useEffect(() => {
    const rentalId = Taro.getCurrentInstance().router?.params.rentalId;
    if (!rentalId) {
      setFailed(true);
      setLoading(false);
      return;
    }

    fetchHouseRecordTimeline(rentalId)
      .then((data) => {
        setTimeline(data);
        setFailed(false);
      })
      .catch(() => {
        setFailed(true);
        void Taro.showToast({ title: '成长记录暂时无法打开', icon: 'none' });
      })
      .finally(() => setLoading(false));
  }, []);

  /** 打开某个自然日固化的只读房屋模型。 */
  function openSnapshot(node: HouseRecordTimelineNode) {
    if (!timeline) return;
    void Taro.navigateTo({
      url:
        `/pages/house-record/model/index?rentalId=${timeline.rentalId}` +
        `&snapshotDate=${node.snapshotDate}`
    });
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

      {timeline.nodes.length > 0 ? (
        <GrowthTree nodes={timeline.nodes} onSelect={openSnapshot} />
      ) : (
        <View className="timeline-empty">
          <Text className="timeline-empty__title">枝头还没有新的生活痕迹</Text>
          <Text className="timeline-empty__text">记录者更新后，真实日期会从这里长出来</Text>
        </View>
      )}
    </AppLayout>
  );
}
