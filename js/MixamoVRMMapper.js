/**
 * MixamoVRMMapper.js
 * Mixamoアニメーションからのデータをより正確にVRMモデルにマッピングするための専用ユーティリティ
 */

import * as THREE from 'three';

export class MixamoVRMMapper {
  /**
   * コンストラクタ
   * @param {Object} vrm - VRMインスタンス
   */
  constructor(vrm) {
    this.vrm = vrm;
    this.cachedBoneMap = null;
    this.cachedRetargetMap = null;
    this.debugMode = false;
    
    // VRMモデルが有効かチェック
    if (!vrm || !vrm.humanoid || !vrm.scene) {
      console.error('MixamoVRMMapper: 有効なVRMモデルではありません');
      return;
    }

    // 初期解析を実行
    this.analyzeVRMStructure();
  }

  /**
   * VRMの構造を解析し、内部データ構造を構築する
   */
  analyzeVRMStructure() {
    // 解析結果を格納するオブジェクト
    this.vrmStructure = {
      humanoidBones: {},     // VRMヒューマノイドボーンのマップ
      nonHumanoidBones: [],  // 非ヒューマノイドのボーンリスト
      fingerBones: {},       // 指のボーン
      vrm10Notation: {},     // VRM1.0表記のボーンマップ
      vrm09Notation: {}      // VRM0.9表記のボーンマップ
    };

    // ヒューマノイドボーンを収集
    if (this.vrm.humanoid && this.vrm.humanoid.humanBones) {
      for (const [boneName, boneData] of Object.entries(this.vrm.humanoid.humanBones)) {
        if (boneData && boneData.node) {
          // ヒューマノイドボーンを登録
          this.vrmStructure.humanoidBones[boneName] = {
            name: boneData.node.name,
            node: boneData.node,
            type: 'humanoid'
          };
          
          // 指のボーンを分類
          if (this.isFingerBone(boneName)) {
            if (!this.vrmStructure.fingerBones[this.getFingerGroup(boneName)]) {
              this.vrmStructure.fingerBones[this.getFingerGroup(boneName)] = [];
            }
            this.vrmStructure.fingerBones[this.getFingerGroup(boneName)].push({
              name: boneName,
              nodeName: boneData.node.name
            });
          }
        }
      }
    }
    
    // シーン内の全ボーンを走査
    this.vrm.scene.traverse(node => {
      if (node.isBone || node.type === 'Bone') {
        // 既存のヒューマノイドボーンでなければ非ヒューマノイドボーンとして登録
        let isHumanoid = false;
        for (const boneData of Object.values(this.vrmStructure.humanoidBones)) {
          if (boneData.node === node) {
            isHumanoid = true;
            break;
          }
        }
        
        if (!isHumanoid) {
          this.vrmStructure.nonHumanoidBones.push({
            name: node.name,
            node: node,
            type: 'nonHumanoid'
          });
        }
      }
    });
    
    // デバッグモードの場合、解析結果を表示
    if (this.debugMode) {
      console.log('VRM構造解析結果:', this.vrmStructure);
      console.log(`ヒューマノイドボーン数: ${Object.keys(this.vrmStructure.humanoidBones).length}`);
      console.log(`非ヒューマノイドボーン数: ${this.vrmStructure.nonHumanoidBones.length}`);
      console.log(`指グループ: ${Object.keys(this.vrmStructure.fingerBones).length}`);
    }
  }
  
  /**
   * 指のボーンかどうかを判定
   * @param {string} boneName - ボーン名
   * @returns {boolean} 指のボーンかどうか
   */
  isFingerBone(boneName) {
    const fingerNames = [
      'Thumb', 'Index', 'Middle', 'Ring', 'Little',
      'thumb', 'index', 'middle', 'ring', 'little'
    ];
    return fingerNames.some(name => boneName.includes(name));
  }
  
  /**
   * 指のグループ名を取得
   * @param {string} boneName - ボーン名
   * @returns {string} 指のグループ名
   */
  getFingerGroup(boneName) {
    boneName = boneName.toLowerCase();
    if (boneName.includes('thumb')) return 'thumb';
    if (boneName.includes('index')) return 'index';
    if (boneName.includes('middle')) return 'middle';
    if (boneName.includes('ring')) return 'ring';
    if (boneName.includes('little') || boneName.includes('pinky')) return 'little';
    return 'unknown';
  }

  /**
   * MixamoからVRMへのボーンマッピングを取得
   * @returns {Object} ボーンマッピング（mixamo名 -> VRM名）
   */
  getMixamoToVRMBoneMap() {
    // キャッシュがあれば再利用
    if (this.cachedBoneMap) {
      return this.cachedBoneMap;
    }
    
    // 基本ボーンマッピングテーブル (Mixamo -> VRM)
    const boneMap = {
      // 基幹ボーン
      'mixamorigHips': this.getVRMBoneByName('hips'),
      'mixamorigSpine': this.getVRMBoneByName('spine'),
      'mixamorigSpine1': this.getVRMBoneByName('chest'),
      'mixamorigSpine2': this.getVRMBoneByName('upperChest'),
      'mixamorigNeck': this.getVRMBoneByName('neck'),
      'mixamorigHead': this.getVRMBoneByName('head'),
      
      // 左腕
      'mixamorigLeftShoulder': this.getVRMBoneByName('leftShoulder'),
      'mixamorigLeftArm': this.getVRMBoneByName('leftUpperArm'),
      'mixamorigLeftForeArm': this.getVRMBoneByName('leftLowerArm'),
      'mixamorigLeftHand': this.getVRMBoneByName('leftHand'),
      
      // 右腕
      'mixamorigRightShoulder': this.getVRMBoneByName('rightShoulder'),
      'mixamorigRightArm': this.getVRMBoneByName('rightUpperArm'),
      'mixamorigRightForeArm': this.getVRMBoneByName('rightLowerArm'),
      'mixamorigRightHand': this.getVRMBoneByName('rightHand'),
      
      // 左脚
      'mixamorigLeftUpLeg': this.getVRMBoneByName('leftUpperLeg'),
      'mixamorigLeftLeg': this.getVRMBoneByName('leftLowerLeg'),
      'mixamorigLeftFoot': this.getVRMBoneByName('leftFoot'),
      'mixamorigLeftToeBase': this.getVRMBoneByName('leftToes'),
      
      // 右脚
      'mixamorigRightUpLeg': this.getVRMBoneByName('rightUpperLeg'),
      'mixamorigRightLeg': this.getVRMBoneByName('rightLowerLeg'),
      'mixamorigRightFoot': this.getVRMBoneByName('rightFoot'),
      'mixamorigRightToeBase': this.getVRMBoneByName('rightToes')
    };
    
    // 指のボーンマッピングを追加
    this.addFingerBoneMapping(boneMap);
    
    // キャッシュを保存
    this.cachedBoneMap = boneMap;
    return boneMap;
  }
  
  /**
   * 指のボーンマッピングを追加
   * @param {Object} boneMap - ボーンマッピングオブジェクト
   */
  addFingerBoneMapping(boneMap) {
    // 左手の指
    const leftFingerMap = {
      // 親指
      'mixamorigLeftHandThumb1': this.getVRMBoneByName('leftThumbProximal'),
      'mixamorigLeftHandThumb2': this.getVRMBoneByName('leftThumbIntermediate'),
      'mixamorigLeftHandThumb3': this.getVRMBoneByName('leftThumbDistal'),
      
      // 人差し指
      'mixamorigLeftHandIndex1': this.getVRMBoneByName('leftIndexProximal'),
      'mixamorigLeftHandIndex2': this.getVRMBoneByName('leftIndexIntermediate'),
      'mixamorigLeftHandIndex3': this.getVRMBoneByName('leftIndexDistal'),
      
      // 中指
      'mixamorigLeftHandMiddle1': this.getVRMBoneByName('leftMiddleProximal'),
      'mixamorigLeftHandMiddle2': this.getVRMBoneByName('leftMiddleIntermediate'),
      'mixamorigLeftHandMiddle3': this.getVRMBoneByName('leftMiddleDistal'),
      
      // 薬指
      'mixamorigLeftHandRing1': this.getVRMBoneByName('leftRingProximal'),
      'mixamorigLeftHandRing2': this.getVRMBoneByName('leftRingIntermediate'),
      'mixamorigLeftHandRing3': this.getVRMBoneByName('leftRingDistal'),
      
      // 小指
      'mixamorigLeftHandPinky1': this.getVRMBoneByName('leftLittleProximal'),
      'mixamorigLeftHandPinky2': this.getVRMBoneByName('leftLittleIntermediate'),
      'mixamorigLeftHandPinky3': this.getVRMBoneByName('leftLittleDistal')
    };
    
    // 右手の指
    const rightFingerMap = {
      // 親指
      'mixamorigRightHandThumb1': this.getVRMBoneByName('rightThumbProximal'),
      'mixamorigRightHandThumb2': this.getVRMBoneByName('rightThumbIntermediate'),
      'mixamorigRightHandThumb3': this.getVRMBoneByName('rightThumbDistal'),
      
      // 人差し指
      'mixamorigRightHandIndex1': this.getVRMBoneByName('rightIndexProximal'),
      'mixamorigRightHandIndex2': this.getVRMBoneByName('rightIndexIntermediate'),
      'mixamorigRightHandIndex3': this.getVRMBoneByName('rightIndexDistal'),
      
      // 中指
      'mixamorigRightHandMiddle1': this.getVRMBoneByName('rightMiddleProximal'),
      'mixamorigRightHandMiddle2': this.getVRMBoneByName('rightMiddleIntermediate'),
      'mixamorigRightHandMiddle3': this.getVRMBoneByName('rightMiddleDistal'),
      
      // 薬指
      'mixamorigRightHandRing1': this.getVRMBoneByName('rightRingProximal'),
      'mixamorigRightHandRing2': this.getVRMBoneByName('rightRingIntermediate'),
      'mixamorigRightHandRing3': this.getVRMBoneByName('rightRingDistal'),
      
      // 小指
      'mixamorigRightHandPinky1': this.getVRMBoneByName('rightLittleProximal'),
      'mixamorigRightHandPinky2': this.getVRMBoneByName('rightLittleIntermediate'),
      'mixamorigRightHandPinky3': this.getVRMBoneByName('rightLittleDistal')
    };
    
    // マッピングテーブルに追加
    Object.assign(boneMap, leftFingerMap, rightFingerMap);
  }
  
  /**
   * VRMボーン名からノード名を取得
   * @param {string} boneName - VRMボーン名
   * @returns {string|null} VRMノード名
   */
  getVRMBoneByName(boneName) {
    if (this.vrmStructure.humanoidBones[boneName]) {
      return this.vrmStructure.humanoidBones[boneName].name;
    }
    return null;
  }
  
  /**
   * Mixamoアニメーションをリターゲットしてアニメーションを生成
   * @param {THREE.AnimationClip} srcClip - 元のアニメーションクリップ
   * @param {string} name - 新しいアニメーション名（省略可）
   * @returns {THREE.AnimationClip} リターゲットされたアニメーションクリップ
   */
  retargetAnimation(srcClip, name = null) {
    if (!srcClip) {
      console.error('MixamoVRMMapper: アニメーションクリップがnullです');
      return null;
    }
    
    // ボーンマッピングを取得
    const boneMap = this.getMixamoToVRMBoneMap();
    
    // リターゲット用の新しいトラックを格納する配列
    const retargetedTracks = [];
    
    // プロセス済みのボーンを記録
    const processedBones = new Set();
    
    // 適用できないトラックを記録
    const skippedTracks = [];
    
    // 各トラックをリターゲット
    for (const track of srcClip.tracks) {
      const trackSplits = track.name.split('.');
      const boneName = trackSplits[0];
      const propertyName = trackSplits.slice(1).join('.');
      
      // VRMボーン名に変換
      const vrmBoneName = boneMap[boneName];
      
      if (vrmBoneName) {
        // 新しいトラック名を生成
        const newTrackName = `${vrmBoneName}.${propertyName}`;
        
        // トラックのクローンを作成して名前を変更
        const retargetedTrack = track.clone();
        retargetedTrack.name = newTrackName;
        
        // ヒップボーンの場合、回転を調整（Y軸180度回転）
        if (boneName === 'mixamorigHips' && propertyName === 'quaternion') {
          this.adjustHipRotation(retargetedTrack);
        }
        
        // リターゲット済みトラックに追加
        retargetedTracks.push(retargetedTrack);
        processedBones.add(vrmBoneName);
        
        if (this.debugMode) {
          console.log(`リターゲット: ${boneName} -> ${vrmBoneName} (${propertyName})`);
        }
      } else {
        // マッピングされていないトラックをスキップ
        skippedTracks.push(`${boneName}.${propertyName}`);
      }
    }
    
    // 新しいアニメーションクリップを生成
    const retargetedClip = new THREE.AnimationClip(
      name || `${srcClip.name} (Retargeted)`,
      srcClip.duration,
      retargetedTracks
    );
    
    // デバッグ情報
    if (this.debugMode || skippedTracks.length > 0) {
      console.info(`アニメーションリターゲット完了: ${retargetedTracks.length}/${srcClip.tracks.length} トラック`);
      console.info(`- 処理済みボーン: ${processedBones.size}個`);
      
      if (skippedTracks.length > 0) {
        console.warn(`- スキップしたトラック: ${skippedTracks.length}個`);
        console.warn(`  最初の5つ: ${skippedTracks.slice(0, 5).join(', ')}`);
      }
    }
    
    return retargetedClip;
  }
  
  /**
   * ヒップの回転を調整（Mixamo -> VRMの座標系変換）
   * @param {THREE.KeyframeTrack} track - キーフレームトラック
   */
  adjustHipRotation(track) {
    // Y軸180度回転用のクォータニオン
    const yRotation180 = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI
    );
    
    // 各キーフレームの回転を調整
    for (let i = 0; i < track.values.length; i += 4) {
      // クォータニオン値を抽出
      const quat = new THREE.Quaternion(
        track.values[i],
        track.values[i + 1],
        track.values[i + 2],
        track.values[i + 3]
      );
      
      // Y軸180度回転を適用
      quat.premultiply(yRotation180);
      
      // 調整後の値を設定
      track.values[i] = quat.x;
      track.values[i + 1] = quat.y;
      track.values[i + 2] = quat.z;
      track.values[i + 3] = quat.w;
    }
  }
  
  /**
   * デバッグモードの切り替え
   * @param {boolean} enabled - 有効/無効
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  
  /**
   * トラックの検証情報を取得
   * @param {THREE.AnimationClip} clip - 検証するアニメーションクリップ
   * @returns {Object} 検証結果
   */
  validateClip(clip) {
    const availableBones = new Set();
    
    // 利用可能なボーン名を収集
    this.vrm.scene.traverse(node => {
      if (node.isBone || node.type === 'Bone') {
        availableBones.add(node.name);
      }
    });

    const validTracks = [];
    const invalidTracks = [];
    
    // 各トラックを検証
    for (const track of clip.tracks) {
      const boneName = track.name.split('.')[0];
      if (availableBones.has(boneName)) {
        validTracks.push(track);
      } else {
        invalidTracks.push(track);
      }
    }
    
    return {
      valid: validTracks.length,
      invalid: invalidTracks.length,
      total: clip.tracks.length,
      validRatio: validTracks.length / clip.tracks.length,
      validTracks,
      invalidTracks
    };
  }
}
