import type { RentalComment } from '@shared/contracts/rental';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { createRentalComment, deleteRentalComment, fetchRentalComments } from '@/shared/api/services';

import './index.scss';

interface Props {
  rentalId: string;
}

/** 屋檐故事公开评论区，用于追问细节和补充体验。 */
export function CommentSection({ rentalId }: Props) {
  const [comments, setComments] = useState<RentalComment[]>([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchRentalComments(rentalId)
      .then(setComments)
      .catch(() => Taro.showToast({ title: '评论加载失败', icon: 'none' }));
  }, [rentalId]);

  async function handleSubmit() {
    const value = content.trim();
    if (!value) {
      void Taro.showToast({ title: '请填写评论内容', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const next = await createRentalComment(rentalId, value);
      setComments((prev) => [...prev, next]);
      setContent('');
    } catch {
      void Taro.showToast({ title: '评论发送失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteRentalComment(commentId);
      setComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch {
      void Taro.showToast({ title: '只能删除自己的评论', icon: 'none' });
    }
  }

  return (
    <View className="comment-section">
      <Text className="comment-section__title">评论讨论</Text>
      <View className="comment-section__composer">
        <Input
          className="comment-section__input"
          value={content}
          placeholder="追问细节，或补充你的居住经验"
          onInput={(event) => setContent(event.detail.value)}
        />
        <Button className="comment-section__button" loading={submitting} onClick={handleSubmit}>
          发送
        </Button>
      </View>
      <View className="comment-section__list">
        {comments.length === 0 && <Text className="comment-section__empty">还没有评论，来问第一个问题</Text>}
        {comments.map((comment) => (
          <View key={comment.id} className="comment-section__item">
            <Text className="comment-section__author">{comment.authorName}</Text>
            <Text className="comment-section__content">{comment.content}</Text>
            <Text className="comment-section__delete" onClick={() => void handleDelete(comment.id)}>
              删除
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
