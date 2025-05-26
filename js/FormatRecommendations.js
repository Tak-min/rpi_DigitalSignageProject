/**
 * アニメーション形式の推奨事項と互換性情報
 */
export class FormatRecommendations {
  
  /**
   * VRMモデルに最適なアニメーション形式を推奨
   * @returns {Object} 推奨情報
   */
  static getRecommendations() {
    return {
      // 最推奨：VRMAファイル
      vrma: {
        priority: 1,
        name: 'VRMA (VRM Animation)',
        compatibility: '完全互換',
        pros: [
          'VRM専用のアニメーション形式',
          'ボーンマッピング不要',
          'VRMの全機能をサポート',
          '表情アニメーションも含まれる',
          'ファイルサイズが小さい'
        ],
        cons: [
          'VRMアニメーション作成ツールが限定的',
          'アニメーション素材が少ない'
        ],
        sources: [
          'VRoid Studio',
          'Unity VRM SDK',
          'Blender VRM add-on'
        ]
      },
      
      // 次推奨：BVHファイル
      bvh: {
        priority: 2,
        name: 'BVH (Biovision Hierarchy)',
        compatibility: '高互換（変換必要）',
        pros: [
          'モーションキャプチャーの標準形式',
          '豊富なモーション素材',
          'VRMへの変換ツールが充実',
          'リアルなアニメーション'
        ],
        cons: [
          'ボーンマッピングと変換が必要',
          'ファイルサイズが大きい',
          'フィンガーアニメーションなし'
        ],
        sources: [
          'Carnegie Mellon University Motion Capture Database',
          'Adobe Mixamo (BVH出力)',
          'Rokoko Studio'
        ]
      },
      
      // 現在使用中：FBXファイル
      fbx: {
        priority: 3,
        name: 'FBX (Filmbox)',
        compatibility: '中互換（リターゲティング必要）',
        pros: [
          'Maya/3ds Maxなど主要DCCで標準',
          'Adobe Mixamoで豊富な素材',
          '業界標準の形式'
        ],
        cons: [
          'VRMとボーン構造が異なる',
          '複雑なリターゲティングが必要',
          'フィンガーアニメーションの互換性問題',
          '座標系の変換が必要'
        ],
        sources: [
          'Adobe Mixamo',
          'Autodesk Maya',
          '3ds Max'
        ]
      },
      
      // 最低互換：GLTFファイル
      gltf: {
        priority: 4,
        name: 'GLTF/GLB',
        compatibility: '低互換（大幅な調整必要）',
        pros: [
          'Web標準の3D形式',
          'Three.jsで直接サポート',
          'ファイルサイズが小さい'
        ],
        cons: [
          'VRMとの互換性が低い',
          'ヒューマノイドボーン構造が異なる',
          '手動でのボーンマッピングが必須'
        ],
        sources: [
          'Blender',
          'Sketchfab',
          'KhronosGroup'
        ]
      }
    };
  }

  /**
   * 現在の問題に基づく推奨アクション
   * @param {Object} currentIssues - 現在の問題
   * @returns {Object} 推奨アクション
   */
  static getRecommendedActions(currentIssues = {}) {
    const actions = [];
    
    if (currentIssues.animationNotPlaying) {
      actions.push({
        priority: 'high',
        action: 'VRMAファイルの使用',
        description: 'Mixamo FBXの代わりにVRMAファイルを使用することで、互換性問題を根本的に解決',
        steps: [
          '1. VRoid Studioでモデルにアニメーションを追加',
          '2. VRMAファイルとしてエクスポート',
          '3. config.jsonの設定を更新'
        ]
      });
      
      actions.push({
        priority: 'medium',
        action: 'BVHファイルの変換',
        description: 'BVHファイルをVRMAに変換して使用',
        steps: [
          '1. CMU Motion Capture DatabaseからBVHファイルをダウンロード',
          '2. BlenderのVRM add-onでVRMAに変換',
          '3. VRMモデルに適用してテスト'
        ]
      });
    }

    if (currentIssues.movementTooFast) {
      actions.push({
        priority: 'low',
        action: '移動速度の微調整',
        description: 'config.jsonで移動速度をさらに調整',
        steps: [
          '1. moveSpeedを0.005以下に設定',
          '2. フレームレート依存の移動を確認',
          '3. アニメーション速度との同期調整'
        ]
      });
    }

    return actions;
  }

  /**
   * VRMAファイル作成のガイド
   * @returns {Object} 作成ガイド
   */
  static getVRMACreationGuide() {
    return {
      title: 'VRMAファイル作成ガイド',
      methods: [
        {
          tool: 'VRoid Studio',
          difficulty: '初心者',
          steps: [
            '1. VRoid Studioを起動',
            '2. 既存のVRMモデルを読み込み',
            '3. アニメーション > モーション追加',
            '4. BVHファイルを読み込み（オプション）',
            '5. アニメーションを調整',
            '6. VRMAとしてエクスポート'
          ]
        },
        {
          tool: 'Unity + VRM SDK',
          difficulty: '中級者',
          steps: [
            '1. Unity 2022.3 LTS以降をインストール',
            '2. VRM SDKをインポート',
            '3. VRMモデルを読み込み',
            '4. Animation Controllerを設定',
            '5. VRMAExporterでエクスポート'
          ]
        },
        {
          tool: 'Blender + VRM add-on',
          difficulty: '上級者',
          steps: [
            '1. Blender 3.0以降とVRM add-onをインストール',
            '2. VRMモデルをインポート',
            '3. BVH/FBXアニメーションをリターゲット',
            '4. VRMアーマチュアに適用',
            '5. VRMAとしてエクスポート'
          ]
        }
      ]
    };
  }

  /**
   * 互換性テストの推奨
   * @returns {Object} テスト項目
   */
  static getCompatibilityTests() {
    return {
      title: '動作確認テスト項目',
      tests: [
        {
          category: 'アニメーション再生',
          items: [
            'T-poseから正常にアニメーションが開始される',
            'ループアニメーションが滑らかに再生される',
            'アニメーション間の切り替えが正常',
            'アニメーション終了時の姿勢が正しい'
          ]
        },
        {
          category: '移動とアニメーション',
          items: [
            '移動方向とキャラクターの向きが一致',
            '移動速度とアニメーション速度が同期',
            '停止時に自然なアイドル状態に戻る',
            '画面境界での移動制限が正常'
          ]
        },
        {
          category: '表情とボーン',
          items: [
            '表情アニメーションが正常に動作',
            'フィンガーアニメーションが適用される',
            'ボーンの回転が自然',
            '衣装やアクセサリーが正しく追従'
          ]
        }
      ]
    };
  }
}
