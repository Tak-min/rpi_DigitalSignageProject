/**
 * VRMボーン構造解析ユーティリティ
 * VRMモデルの実際のボーン名を調査し、正確なマッピングを生成する
 */
export class VRMBoneAnalyzer {
  
  /**
   * VRMモデルのボーン構造を解析
   * @param {Object} vrm - VRMインスタンス
   * @returns {Object} ボーン情報
   */
  static analyzeVRMBones(vrm) {
    const boneInfo = {
      humanoidBones: {},
      allBones: [],
      skeletonStructure: {}
    };

    if (!vrm || !vrm.scene) {
      console.error('VRMインスタンスまたはシーンが無効です');
      return boneInfo;
    }

    // ヒューマノイドボーンの取得
    if (vrm.humanoid && vrm.humanoid.humanBones) {
      console.log('=== VRMヒューマノイドボーン構造 ===');
      
      for (const [boneName, boneNode] of Object.entries(vrm.humanoid.humanBones)) {
        if (boneNode && boneNode.node) {
          boneInfo.humanoidBones[boneName] = {
            name: boneNode.node.name,
            uuid: boneNode.node.uuid,
            type: boneNode.node.type
          };
          console.log(`${boneName}: ${boneNode.node.name}`);
        }
      }
    }

    // 全ボーンの取得
    vrm.scene.traverse((child) => {
      if (child.isBone || child.type === 'Bone') {
        boneInfo.allBones.push({
          name: child.name,
          uuid: child.uuid,
          parent: child.parent ? child.parent.name : null
        });
      }
    });

    console.log(`=== 検出されたボーン総数: ${boneInfo.allBones.length} ===`);
    
    return boneInfo;
  }

  /**
   * Mixamoボーン名からVRMボーン名への正確なマッピングを生成
   * @param {Object} vrm - VRMインスタンス
   * @returns {Object} マッピング辞書
   */
  static generateAccurateBoneMapping(vrm) {
    const boneInfo = this.analyzeVRMBones(vrm);
    const mapping = {};

    // ヒューマノイドボーンが利用可能な場合
    if (Object.keys(boneInfo.humanoidBones).length > 0) {
      // VRMヒューマノイドボーン名をベースにマッピング
      const vrmToMixamo = {
        // Core
        'hips': 'mixamorigHips',
        'spine': 'mixamorigSpine',
        'chest': 'mixamorigSpine1',
        'upperChest': 'mixamorigSpine2',
        'neck': 'mixamorigNeck',
        'head': 'mixamorigHead',
        
        // Left arm
        'leftShoulder': 'mixamorigLeftShoulder',
        'leftUpperArm': 'mixamorigLeftArm',
        'leftLowerArm': 'mixamorigLeftForeArm',
        'leftHand': 'mixamorigLeftHand',
        
        // Right arm
        'rightShoulder': 'mixamorigRightShoulder',
        'rightUpperArm': 'mixamorigRightArm',
        'rightLowerArm': 'mixamorigRightForeArm',
        'rightHand': 'mixamorigRightHand',
        
        // Left leg
        'leftUpperLeg': 'mixamorigLeftUpLeg',
        'leftLowerLeg': 'mixamorigLeftLeg',
        'leftFoot': 'mixamorigLeftFoot',
        'leftToes': 'mixamorigLeftToeBase',
          // Right leg
        'rightUpperLeg': 'mixamorigRightUpLeg',
        'rightLowerLeg': 'mixamorigRightLeg',
        'rightFoot': 'mixamorigRightFoot',
        'rightToes': 'mixamorigRightToeBase',
        
        // Left hand fingers
        'leftThumbProximal': 'mixamorigLeftHandThumb1',
        'leftThumbIntermediate': 'mixamorigLeftHandThumb2',
        'leftThumbDistal': 'mixamorigLeftHandThumb3',
        'leftIndexProximal': 'mixamorigLeftHandIndex1',
        'leftIndexIntermediate': 'mixamorigLeftHandIndex2',
        'leftIndexDistal': 'mixamorigLeftHandIndex3',
        'leftMiddleProximal': 'mixamorigLeftHandMiddle1',
        'leftMiddleIntermediate': 'mixamorigLeftHandMiddle2',
        'leftMiddleDistal': 'mixamorigLeftHandMiddle3',
        'leftRingProximal': 'mixamorigLeftHandRing1',
        'leftRingIntermediate': 'mixamorigLeftHandRing2',
        'leftRingDistal': 'mixamorigLeftHandRing3',
        'leftLittleProximal': 'mixamorigLeftHandPinky1',
        'leftLittleIntermediate': 'mixamorigLeftHandPinky2',
        'leftLittleDistal': 'mixamorigLeftHandPinky3',
        
        // Right hand fingers
        'rightThumbProximal': 'mixamorigRightHandThumb1',
        'rightThumbIntermediate': 'mixamorigRightHandThumb2',
        'rightThumbDistal': 'mixamorigRightHandThumb3',
        'rightIndexProximal': 'mixamorigRightHandIndex1',
        'rightIndexIntermediate': 'mixamorigRightHandIndex2',
        'rightIndexDistal': 'mixamorigRightHandIndex3',
        'rightMiddleProximal': 'mixamorigRightHandMiddle1',
        'rightMiddleIntermediate': 'mixamorigRightHandMiddle2',
        'rightMiddleDistal': 'mixamorigRightHandMiddle3',
        'rightRingProximal': 'mixamorigRightHandRing1',
        'rightRingIntermediate': 'mixamorigRightHandRing2',
        'rightRingDistal': 'mixamorigRightHandRing3',
        'rightLittleProximal': 'mixamorigRightHandPinky1',
        'rightLittleIntermediate': 'mixamorigRightHandPinky2',
        'rightLittleDistal': 'mixamorigRightHandPinky3'
      };

      // 逆マッピング（Mixamo -> VRM）を作成
      for (const [vrmBone, mixamoBone] of Object.entries(vrmToMixamo)) {
        if (boneInfo.humanoidBones[vrmBone]) {
          mapping[mixamoBone] = boneInfo.humanoidBones[vrmBone].name;
        }
      }
    }

    console.log('=== 生成されたボーンマッピング ===');
    console.log(mapping);
    
    return mapping;
  }
  /**
   * VRM特有のボーンかどうかを判定（髪、アクセサリー、ネームプレートなど）
   * @param {string} boneName - ボーン名
   * @returns {boolean} VRM特有のボーンかどうか
   */  static isVRMSpecificBone(boneName) {
    const vrmSpecificPrefixes = [
      'J_Sec_Hair',     // 髪のボーン
      'J_Sec_',         // セカンダリボーン（髪、服など）
      'NamePlate',      // ネームプレート
      'J_Adj_',         // 調整ボーン
      'J_Bip_C_Hair',   // 髪の基幹ボーン
      'spring',         // スプリングボーン
      'Spring',         // スプリングボーン（大文字）
      'Accessory',      // アクセサリー
      'J_Opt_',         // オプショナルボーン
      'Cf_D_',          // ダイナミクス関連ボーン
      'Cf_J_',          // カスタムジョイント
      'Cf_O_',          // その他のカスタムボーン
      'Hair',           // 髪ボーン
      'Eye',            // 眼に関連するボーン
      'Jacket',         // 衣装ボーン
      'Skirt',          // スカートボーン
      'Tail'            // 尾や装飾のテール
    ];
    
    // パターンマッチングで検出する特別なケース
    const vrmSpecificPatterns = [
      /^NamePlate\d+$/,          // NamePlate1, NamePlate2 など
      /^J_Sec_Hair\d+_\d+$/,     // J_Sec_Hair1_12 など
      /^Hair\d+$/,               // Hair1, Hair2 など
      /^Accessory\d+$/           // Accessory1 など
    ];
    
    // プレフィックスマッチング
    const prefixMatch = vrmSpecificPrefixes.some(prefix => 
      boneName.startsWith(prefix) || boneName.includes(prefix));
    
    // パターンマッチング
    const patternMatch = vrmSpecificPatterns.some(pattern => 
      pattern.test(boneName));
    
    return prefixMatch || patternMatch;
  }

  /**
   * アニメーショントラックの有効性を検証
   * @param {Object} vrm - VRMインスタンス  
   * @param {THREE.AnimationClip} animation - 検証するアニメーション
   * @returns {Object} 検証結果
   */  static validateAnimationTracks(vrm, animation) {
    const result = {
      validTracks: [],
      invalidTracks: [],
      vrmSpecificTracks: [], // VRM特有のボーン（髪、アクセサリーなど）
      totalTracks: animation.tracks.length
    };

    const boneInfo = this.analyzeVRMBones(vrm);
    const availableBoneNames = new Set([
      ...Object.values(boneInfo.humanoidBones).map(b => b.name),
      ...boneInfo.allBones.map(b => b.name)
    ]);    for (const track of animation.tracks) {
      const trackParts = track.name.split('.');
      const boneName = trackParts[0];
      
      // VRM特有のボーン（髪、アクセサリーなど）かどうかを最初に確認
      if (this.isVRMSpecificBone(boneName)) {
        result.vrmSpecificTracks.push(track.name);
        continue;  // VRM特有のボーンは他の検証をスキップ
      }
      
      // ボーン名がVRMモデルに存在するか確認
      if (availableBoneNames.has(boneName)) {
        result.validTracks.push(track.name);
      } else {
        result.invalidTracks.push(track.name);
      }
    }

    console.log('=== アニメーショントラック検証結果 ===');
    console.log(`有効: ${result.validTracks.length}/${result.totalTracks}`);
    console.log(`無効: ${result.invalidTracks.length}/${result.totalTracks}`);
    console.log(`VRM特有のボーン: ${result.vrmSpecificTracks.length}/${result.totalTracks}`);
    
    // 無効なトラックのうち、最初の5つを表示（デバッグ用）
    if (result.invalidTracks.length > 0) {
      console.log('無効なトラックの例（最大5つ）:');
      result.invalidTracks.slice(0, 5).forEach(t => console.log(`- ${t}`));
    }
    
    return result;
  }

  /**
   * デバッグ情報を出力
   * @param {Object} vrm - VRMインスタンス
   */
  static printDebugInfo(vrm) {
    console.log('=== VRM詳細解析開始 ===');
    
    const boneInfo = this.analyzeVRMBones(vrm);
    const mapping = this.generateAccurateBoneMapping(vrm);
    
    console.log('ヒューマノイドボーン数:', Object.keys(boneInfo.humanoidBones).length);
    console.log('全ボーン数:', boneInfo.allBones.length);
    console.log('生成されたマッピング数:', Object.keys(mapping).length);
    
    // 利用可能なボーン名の一部を表示
    console.log('=== 利用可能なボーン名（最初の20個）===');
    boneInfo.allBones.slice(0, 20).forEach(bone => {
      console.log(`- ${bone.name} (親: ${bone.parent})`);
    });
    
    console.log('=== VRM詳細解析完了 ===');
    
    return { boneInfo, mapping };
  }
}
